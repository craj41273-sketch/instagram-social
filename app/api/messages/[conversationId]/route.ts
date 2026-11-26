import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getApiProfile } from "@/lib/api/identity";
import {
  getConversationHeader,
  listMessages,
  sendMessage,
} from "@/lib/db/messaging";
import { AppError, toSafeMessage } from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import { MESSAGE_RATE_LIMIT } from "@/lib/messaging/constants";
import { publishMessageSignal } from "@/lib/realtime/publish";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { isSameOriginPost } from "@/lib/security/request-origin";
import {
  messagePageQuerySchema,
  sendMessageSchema,
} from "@/lib/validations/messaging";

interface RouteContext {
  params: Promise<{ conversationId: string }>;
}

function errorStatus(error: unknown): number {
  if (error instanceof AppError && error.code === "authorization") return 403;
  if (error instanceof AppError && error.code === "validation") return 400;
  return 500;
}

/** Authoritative, participant-scoped message history. */
export async function GET(request: NextRequest, context: RouteContext) {
  const { conversationId } = await context.params;
  const current = await getApiProfile("messages.list.identity");
  if (!current) {
    return NextResponse.json({ error: "Sign in to read messages." }, { status: 401 });
  }

  const parsed = messagePageQuerySchema.safeParse({
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid page request." }, { status: 400 });
  }

  try {
    const header = await getConversationHeader(conversationId, current.user.id);
    if (!header) {
      return NextResponse.json({ error: "That conversation is not available." }, { status: 404 });
    }

    const page = await listMessages(conversationId, current.user.id, parsed.data);
    return NextResponse.json(page, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logServerError("messages.list", error, { conversationId });
    return NextResponse.json({ error: toSafeMessage(error) }, { status: 500 });
  }
}

/** Persists to Neon first; Broadcast is only an optional refresh signal. */
export async function POST(request: NextRequest, context: RouteContext) {
  const { conversationId } = await context.params;
  if (!isSameOriginPost(request.headers.get("origin"), request.nextUrl.origin)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }

  const current = await getApiProfile("messages.send.identity");
  if (!current) {
    return NextResponse.json({ error: "Sign in to send messages." }, { status: 401 });
  }

  if (
    !consumeRateLimit(
      `messages:send:${current.user.id}`,
      MESSAGE_RATE_LIMIT.limit,
      MESSAGE_RATE_LIMIT.windowMs,
    ).allowed
  ) {
    return NextResponse.json({ error: "Too many messages. Please wait a moment." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "We could not read that message." }, { status: 400 });
  }

  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Enter a valid message." },
      { status: 400 },
    );
  }

  try {
    const result = await sendMessage(conversationId, current.user.id, parsed.data);

    void publishMessageSignal(
      {
        conversationId,
        messageId: result.message.id,
        version: Date.parse(result.message.createdAt),
      },
      result.recipientUserId,
    );

    revalidatePath("/messages");
    revalidatePath(`/messages/${conversationId}`);
    return NextResponse.json({ message: result.message }, { status: 201 });
  } catch (error) {
    logServerError("messages.send", error, { conversationId });
    return NextResponse.json(
      { error: toSafeMessage(error) },
      { status: errorStatus(error) },
    );
  }
}
