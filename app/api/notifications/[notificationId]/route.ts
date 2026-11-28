import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getApiProfile } from "@/lib/api/identity";
import { isActiveUser } from "@/lib/auth/dal";
import { markNotificationRead } from "@/lib/db/notifications";
import { toSafeMessage } from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import { NOTIFICATION_RATE_LIMIT } from "@/lib/messaging/constants";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { isSameOriginPost } from "@/lib/security/request-origin";
import { notificationIdSchema } from "@/lib/validations/notifications";

interface RouteContext {
  params: Promise<{ notificationId: string }>;
}

/** Marks one notification read only when the caller is its recipient. */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { notificationId } = await context.params;
  if (!isSameOriginPost(request.headers.get("origin"), request.nextUrl.origin)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }

  const parsed = notificationIdSchema.safeParse(notificationId);
  if (!parsed.success) {
    return NextResponse.json({ error: "That notification is not available." }, { status: 400 });
  }

  const current = await getApiProfile("notifications.read.identity");
  if (!current) {
    return NextResponse.json({ error: "Sign in to manage notifications." }, { status: 401 });
  }
  if (!isActiveUser(current.user)) {
    return NextResponse.json(
      { error: "Your account cannot perform this action." },
      { status: 403 },
    );
  }

  if (
    !consumeRateLimit(
      `notifications:read:${current.user.id}`,
      NOTIFICATION_RATE_LIMIT.limit,
      NOTIFICATION_RATE_LIMIT.windowMs,
    ).allowed
  ) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  try {
    await markNotificationRead(current.user.id, parsed.data);
    revalidatePath("/notifications");
    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("notifications.read", error, { notificationId: parsed.data });
    return NextResponse.json({ error: toSafeMessage(error) }, { status: 500 });
  }
}
