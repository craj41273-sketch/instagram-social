import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getActiveProfile } from "@/lib/auth/dal";
import { respondToConversationRequest } from "@/lib/db/messaging";
import { AppError, toSafeMessage } from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import { CONVERSATION_RATE_LIMIT } from "@/lib/messaging/constants";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { isSameOriginPost } from "@/lib/security/request-origin";
import { conversationRequestActionSchema } from "@/lib/validations/messaging";

interface RouteContext {
  params: Promise<{ conversationId: string }>;
}

function errorStatus(error: unknown): number {
  if (error instanceof AppError && error.code === "validation") return 400;
  if (error instanceof AppError && error.code === "authorization") return 403;
  return 500;
}

async function respond(request: NextRequest, context: RouteContext) {
  const { conversationId } = await context.params;
  if (!isSameOriginPost(request.headers.get("origin"), request.nextUrl.origin)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }

  const current = await getActiveProfile();
  if (!current) {
    return NextResponse.json({ error: "Sign in to respond to messages." }, { status: 401 });
  }

  if (
    !consumeRateLimit(
      `conversations:request:${current.user.id}`,
      CONVERSATION_RATE_LIMIT.limit,
      CONVERSATION_RATE_LIMIT.windowMs,
    ).allowed
  ) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "We could not read that request." }, { status: 400 });
  }

  const parsed = conversationRequestActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "That request is not available." }, { status: 400 });
  }

  try {
    const updated = await respondToConversationRequest(
      conversationId,
      current.user.id,
      parsed.data.action,
    );
    if (!updated) {
      return NextResponse.json({ error: "That request is not available." }, { status: 404 });
    }

    revalidatePath("/messages");
    revalidatePath(`/messages/${conversationId}`);
    return NextResponse.json({ ok: true, status: parsed.data.action });
  } catch (error) {
    logServerError("conversations.request", error, { conversationId });
    return NextResponse.json(
      { error: toSafeMessage(error) },
      { status: errorStatus(error) },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return respond(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return respond(request, context);
}
