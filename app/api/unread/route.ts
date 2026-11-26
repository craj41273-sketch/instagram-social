import { NextResponse } from "next/server";
import { getApiProfile } from "@/lib/api/identity";
import { getUnreadCounts } from "@/lib/db/messaging";
import { toSafeMessage } from "@/lib/errors";
import { logServerError } from "@/lib/logging";

/** One combined count request for navigation badges and polling. */
export async function GET() {
  const current = await getApiProfile("unread.identity");
  if (!current) {
    return NextResponse.json({ messages: 0, notifications: 0 });
  }

  try {
    const counts = await getUnreadCounts(current.user.id);
    return NextResponse.json(counts, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logServerError("unread.counts", error);
    return NextResponse.json({ error: toSafeMessage(error) }, { status: 500 });
  }
}
