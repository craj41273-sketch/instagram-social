import { sql, type SQL } from "drizzle-orm";
import { notifications } from "@/lib/db/schema";
import type { PageCursor } from "@/lib/pagination";
import type { NotificationType } from "@/lib/messaging/types";

/** Pure notification SQL. No recipient identity or entity is accepted from a client. */

export interface NotificationWrite {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  entityId: string;
}

export function buildNotificationPageCondition(
  viewerId: string,
  cursor: PageCursor | null,
): SQL {
  const keyset = cursor
    ? sql`
        (
          ${notifications.createdAt} < ${cursor.createdAt}::timestamptz
          or (
            ${notifications.createdAt} = ${cursor.createdAt}::timestamptz
            and ${notifications.id} < ${cursor.id}
          )
        )
      `
    : sql`true`;

  return sql`${notifications.recipientId} = ${viewerId} and ${keyset}`;
}

/**
 * One notification per (recipient, actor, type, entity). A repeated interaction
 * refreshes the existing row instead of creating a duplicate. `guard` ensures
 * the underlying relationship/content still exists at write time.
 */
export function buildUpsertNotificationStatement(
  input: NotificationWrite,
  guard: SQL = sql`true`,
): SQL {
  return sql`
    insert into notifications (
      recipient_id, actor_id, type, entity_id, message, created_at
    )
    select
      ${input.recipientId}::uuid,
      ${input.actorId}::uuid,
      ${input.type},
      ${input.entityId},
      '',
      now()
    where ${input.recipientId}::uuid <> ${input.actorId}::uuid
      and ${guard}
    on conflict (recipient_id, actor_id, type, entity_id)
    do update set created_at = now(), read_at = null
    returning id
  `;
}

export function buildFollowNotificationStatement(
  recipientId: string,
  actorId: string,
): SQL {
  return buildUpsertNotificationStatement(
    { recipientId, actorId, type: "follow", entityId: "" },
    sql`exists (select 1 from users u where u.id = ${recipientId}::uuid)`,
  );
}

export function buildPostNotificationStatement(
  recipientId: string,
  actorId: string,
  postId: string,
  type: "like" | "comment",
): SQL {
  return buildUpsertNotificationStatement(
    { recipientId, actorId, type, entityId: postId },
    sql`exists (
      select 1 from posts p
      where p.id = ${postId}::uuid and p.user_id = ${recipientId}::uuid
    )`,
  );
}

export function buildStoryReactionNotificationStatement(
  recipientId: string,
  actorId: string,
  storyId: string,
): SQL {
  return buildUpsertNotificationStatement(
    { recipientId, actorId, type: "story_reaction", entityId: storyId },
    sql`exists (
      select 1 from stories s
      where s.id = ${storyId}::uuid
        and s.user_id = ${recipientId}::uuid
        and s.expires_at > now()
    )`,
  );
}

/** Only the recipient can mark their own notification read. */
export function buildMarkNotificationReadStatement(
  viewerId: string,
  notificationId: string,
): SQL {
  return sql`
    update notifications
    set read_at = now()
    where id = ${notificationId}::uuid
      and recipient_id = ${viewerId}::uuid
      and read_at is null
    returning id
  `;
}

export function buildMarkAllNotificationsReadStatement(viewerId: string): SQL {
  return sql`
    update notifications
    set read_at = now()
    where recipient_id = ${viewerId}::uuid
      and read_at is null
    returning id
  `;
}

export function buildUnreadNotificationCondition(viewerId: string): SQL {
  return sql`${notifications.recipientId} = ${viewerId} and ${notifications.readAt} is null`;
}
