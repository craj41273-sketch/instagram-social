import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getApiProfile } from "@/lib/api/identity";
import { markAllNotificationsRead } from "@/lib/db/notifications";
import { toSafeMessage } from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import { NOTIFICATION_RATE_LIMIT } from "@/lib/messaging/constants";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { isSameOriginPost } from "@/lib/security/request-origin";

/** Marks only the caller's notifications read. */
export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request.headers.get("origin"), request.nextUrl.origin)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }

  const current = await getApiProfile("notifications.readAll.identity");
  if (!current) {
    return NextResponse.json({ error: "Sign in to manage notifications." }, { status: 401 });
  }

  if (
    !consumeRateLimit(
      `notifications:read-all:${current.user.id}`,
      NOTIFICATION_RATE_LIMIT.limit,
      NOTIFICATION_RATE_LIMIT.windowMs,
    ).allowed
  ) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  try {
    const count = await markAllNotificationsRead(current.user.id);
    revalidatePath("/notifications");
    return NextResponse.json({ ok: true, count });
  } catch (error) {
    logServerError("notifications.readAll", error);
    return NextResponse.json({ error: toSafeMessage(error) }, { status: 500 });
  }
}
