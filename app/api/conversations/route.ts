import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getApiProfile } from "@/lib/api/identity";
import { isActiveUser } from "@/lib/auth/dal";
import { createConversation, listInbox } from "@/lib/db/messaging";
import { toSafeMessage } from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import { CONVERSATION_RATE_LIMIT } from "@/lib/messaging/constants";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { isSameOriginPost } from "@/lib/security/request-origin";
import {
  conversationStartSchema,
  inboxPageQuerySchema,
} from "@/lib/validations/messaging";

/** Authoritative inbox page; clients never synthesize conversations. */
export async function GET(request: NextRequest) {
  const current = await getApiProfile("conversations.list.identity");
  if (!current) {
    return NextResponse.json({ error: "Sign in to view messages." }, { status: 401 });
  }

  const parsed = inboxPageQuerySchema.safeParse({
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid page request." }, { status: 400 });
  }

  try {
    const page = await listInbox(current.user.id, parsed.data);
    return NextResponse.json(page, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logServerError("conversations.list", error);
    return NextResponse.json({ error: toSafeMessage(error) }, { status: 500 });
  }
}

/** Starts or reuses one real one-to-one conversation. */
export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request.headers.get("origin"), request.nextUrl.origin)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }

  const current = await getApiProfile("conversations.create.identity");
  if (!current) {
    return NextResponse.json({ error: "Sign in to send messages." }, { status: 401 });
  }
  if (!isActiveUser(current.user)) {
    return NextResponse.json(
      { error: "Your account cannot perform this action." },
      { status: 403 },
    );
  }

  if (
    !consumeRateLimit(
      `conversations:create:${current.user.id}`,
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

  const parsed = conversationStartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "That profile is not available." }, { status: 400 });
  }

  try {
    const conversationId = await createConversation(current.user.id, parsed.data.username);
    if (!conversationId) {
      return NextResponse.json({ error: "That profile is not available." }, { status: 404 });
    }

    revalidatePath("/messages");
    return NextResponse.json({ conversationId });
  } catch (error) {
    logServerError("conversations.create", error);
    return NextResponse.json({ error: toSafeMessage(error) }, { status: 500 });
  }
}
