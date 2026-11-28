import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getApiProfile } from "@/lib/api/identity";
import { isActiveUser } from "@/lib/auth/dal";
import { getConversationHeader, markConversationRead } from "@/lib/db/messaging";
import { toSafeMessage } from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import { READ_RATE_LIMIT } from "@/lib/messaging/constants";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { isSameOriginPost } from "@/lib/security/request-origin";

interface RouteContext {
  params: Promise<{ conversationId: string }>;
}

/** Marks only the caller's participant row as read. */
export async function POST(request: NextRequest, context: RouteContext) {
  const { conversationId } = await context.params;
  if (!isSameOriginPost(request.headers.get("origin"), request.nextUrl.origin)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }

  const current = await getApiProfile("messages.read.identity");
  if (!current) {
    return NextResponse.json({ error: "Sign in to read messages." }, { status: 401 });
  }
  if (!isActiveUser(current.user)) {
    return NextResponse.json(
      { error: "Your account cannot perform this action." },
      { status: 403 },
    );
  }

  if (
    !consumeRateLimit(
      `messages:read:${current.user.id}`,
      READ_RATE_LIMIT.limit,
      READ_RATE_LIMIT.windowMs,
    ).allowed
  ) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  try {
    const header = await getConversationHeader(conversationId, current.user.id);
    if (!header) {
      return NextResponse.json({ error: "That conversation is not available." }, { status: 404 });
    }

    const updated = await markConversationRead(conversationId, current.user.id);
    if (!updated) {
      return NextResponse.json({ error: "That conversation is not available." }, { status: 404 });
    }

    revalidatePath("/messages");
    revalidatePath("/notifications");
    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("messages.read", error, { conversationId });
    return NextResponse.json({ error: toSafeMessage(error) }, { status: 500 });
  }
}
