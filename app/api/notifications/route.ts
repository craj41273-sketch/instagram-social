import { NextResponse, type NextRequest } from "next/server";
import { getApiProfile } from "@/lib/api/identity";
import { listNotifications } from "@/lib/db/notifications";
import { toSafeMessage } from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import { notificationPageQuerySchema } from "@/lib/validations/notifications";

/** Recipient-scoped notification page for Load More in the notification center. */
export async function GET(request: NextRequest) {
  const current = await getApiProfile("notifications.list.identity");
  if (!current) {
    return NextResponse.json({ error: "Sign in to view notifications." }, { status: 401 });
  }

  const parsed = notificationPageQuerySchema.safeParse({
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid page request." }, { status: 400 });
  }

  try {
    const page = await listNotifications(current.user.id, parsed.data);
    return NextResponse.json(page, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logServerError("notifications.list", error);
    return NextResponse.json({ error: toSafeMessage(error) }, { status: 500 });
  }
}
