import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { parseUserId } from "@/lib/db/profile-sql";
import { publishNotificationSignal } from "@/lib/realtime/publish";
import { logServerError } from "@/lib/logging";

type SafetyNoticeType = "moderation" | "report_update" | "appeal_update";

/** Content-free notices; no private message text or evidence is copied here. */
export async function recordSafetyNotification(
  recipientId: string,
  actorId: string,
  type: SafetyNoticeType,
  entityId: string,
  message: string,
): Promise<void> {
  if (!parseUserId(recipientId) || !parseUserId(actorId) || recipientId === actorId) {
    return;
  }
  try {
    const rows = await getDb()
      .insert(notifications)
      .values({
        recipientId,
        actorId,
        type,
        entityId,
        message: message.slice(0, 200),
      })
      .onConflictDoUpdate({
        target: [
          notifications.recipientId,
          notifications.actorId,
          notifications.type,
          notifications.entityId,
        ],
        set: { message: message.slice(0, 200), createdAt: new Date(), readAt: null },
      })
      .returning({ id: notifications.id });
    if (rows.length > 0) void publishNotificationSignal(recipientId);
  } catch (error) {
    logServerError("notifications.recordSafetyNotification", error);
  }
}

export async function clearSafetyNotifications(
  recipientId: string,
  entityId: string,
  type: SafetyNoticeType,
): Promise<void> {
  if (!parseUserId(recipientId)) return;
  try {
    await getDb()
      .delete(notifications)
      .where(
        and(
          eq(notifications.recipientId, recipientId),
          eq(notifications.entityId, entityId),
          eq(notifications.type, type),
        ),
      );
  } catch (error) {
    logServerError("notifications.clearSafetyNotifications", error);
  }
}
