import "server-only";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  conversationParticipants,
  notifications,
  posts,
  profiles,
  stories,
  userRelationships,
  users,
} from "@/lib/db/schema";
import { buildPostVisibilityCondition } from "@/lib/db/post-query";
import { buildStoryVisibilityCondition } from "@/lib/db/story-query";
import { parseUserId } from "@/lib/db/profile-sql";
import {
  buildFollowNotificationStatement,
  buildMarkAllNotificationsReadStatement,
  buildMarkNotificationReadStatement,
  buildNotificationPageCondition,
  buildPostNotificationStatement,
  buildStoryReactionNotificationStatement,
} from "@/lib/db/notification-sql";
import { publishNotificationSignal } from "@/lib/realtime/publish";
import { resolveNotificationHref, type NotificationTargets } from "@/lib/notifications/navigation";
import { DatabaseError, ValidationError } from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import { decodePageCursor, encodePageCursor } from "@/lib/pagination";
import type {
  NotificationItem,
  NotificationPage,
  NotificationType,
} from "@/lib/messaging/types";

/** Server-only notification reads and writes, scoped to the recipient. */

interface RawRow {
  [key: string]: unknown;
}

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    return Array.isArray(rows) ? (rows as T[]) : [];
  }
  return [];
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date(0).toISOString();
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

async function insertAndAnnounce(
  statement: ReturnType<typeof buildFollowNotificationStatement>,
  recipientId: string,
  scope: string,
): Promise<boolean> {
  try {
    const result = await getDb().execute(statement);
    const created = extractRows<RawRow>(result).length > 0;
    if (created) void publishNotificationSignal(recipientId);
    return created;
  } catch (error) {
    // Notifications are generated after the underlying interaction succeeded;
    // a notice failure must not present that interaction as failed.
    logServerError(scope, error);
    return false;
  }
}

/** Resolves the owner of an interaction target so actions never trust a client recipient. */
export async function getPostOwnerId(postId: string): Promise<string | null> {
  if (!parseUserId(postId)) return null;
  try {
    const rows = await getDb()
      .select({ ownerId: posts.userId })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    return rows[0]?.ownerId ?? null;
  } catch (error) {
    logServerError("db.getPostOwnerId", error, { postId });
    return null;
  }
}

/** Owner lookup for engagement checks; invisible posts yield no owner. */
export async function getVisiblePostOwnerId(
  postId: string,
  viewerId: string | null,
): Promise<string | null> {
  if (!parseUserId(postId)) return null;
  try {
    const rows = await getDb()
      .select({ ownerId: posts.userId })
      .from(posts)
      .where(and(eq(posts.id, postId), buildPostVisibilityCondition(viewerId)))
      .limit(1);
    return rows[0]?.ownerId ?? null;
  } catch (error) {
    logServerError("db.getVisiblePostOwnerId", error, { postId });
    return null;
  }
}

/** Only active stories can produce a valid reaction notification. */
export async function getActiveStoryOwnerId(
  storyId: string,
  viewerId?: string | null,
): Promise<string | null> {
  if (!parseUserId(storyId)) return null;
  try {
    const conditions = [eq(stories.id, storyId), gt(stories.expiresAt, new Date())];
    if (viewerId) conditions.push(buildStoryVisibilityCondition(viewerId, new Date().toISOString()));
    const rows = await getDb()
      .select({ ownerId: stories.userId })
      .from(stories)
      .where(and(...conditions))
      .limit(1);
    return rows[0]?.ownerId ?? null;
  } catch (error) {
    logServerError("db.getActiveStoryOwnerId", error, { storyId });
    return null;
  }
}

export async function recordFollowNotification(
  recipientId: string,
  actorId: string,
): Promise<boolean> {
  if (!parseUserId(recipientId) || !parseUserId(actorId)) return false;
  if (recipientId === actorId) return false;
  return insertAndAnnounce(
    buildFollowNotificationStatement(recipientId, actorId),
    recipientId,
    "db.recordFollowNotification",
  );
}

export async function recordPostNotification(
  recipientId: string,
  actorId: string,
  postId: string,
  type: "like" | "comment",
): Promise<boolean> {
  if (!parseUserId(recipientId) || !parseUserId(actorId) || !parseUserId(postId)) return false;
  if (recipientId === actorId) return false;
  return insertAndAnnounce(
    buildPostNotificationStatement(recipientId, actorId, postId, type),
    recipientId,
    "db.recordPostNotification",
  );
}

export async function recordStoryReactionNotification(
  recipientId: string,
  actorId: string,
  storyId: string,
): Promise<boolean> {
  if (!parseUserId(recipientId) || !parseUserId(actorId) || !parseUserId(storyId)) return false;
  if (recipientId === actorId) return false;
  return insertAndAnnounce(
    buildStoryReactionNotificationStatement(recipientId, actorId, storyId),
    recipientId,
    "db.recordStoryReactionNotification",
  );
}

/**
 * Validates every destination in at most three batched queries so notification
 * rows never produce links to missing posts, expired stories, or other users'
 * conversations.
 */
async function resolveTargets(
  viewerId: string,
  items: Array<Pick<NotificationItem, "type" | "entityId" | "actorUsername">>,
): Promise<NotificationTargets> {
  const targets: NotificationTargets = {
    profiles: new Set(
      items.filter((item) => item.type === "follow").map((item) => item.actorUsername),
    ),
    posts: new Set(),
    stories: new Map(),
    conversations: new Set(),
  };

  const postIds = unique(
    items
      .filter((item) => item.type === "like" || item.type === "comment")
      .map((item) => item.entityId),
  ).filter(parseUserId);
  const storyIds = unique(
    items.filter((item) => item.type === "story_reaction").map((item) => item.entityId),
  ).filter(parseUserId);
  const conversationIds = unique(
    items.filter((item) => item.type === "message").map((item) => item.entityId),
  ).filter(parseUserId);

  if (postIds.length > 0) {
    const rows = await getDb()
      .select({ id: posts.id })
      .from(posts)
      .where(and(inArray(posts.id, postIds), buildPostVisibilityCondition(viewerId)));
    for (const row of rows) targets.posts.add(row.id);
  }

  if (storyIds.length > 0) {
    const rows = await getDb()
      .select({ id: stories.id, ownerId: stories.userId })
      .from(stories)
      .where(
        and(
          inArray(stories.id, storyIds),
          buildStoryVisibilityCondition(viewerId, new Date().toISOString()),
        ),
      );
    for (const row of rows) targets.stories.set(row.id, row.ownerId);
  }

  if (conversationIds.length > 0) {
    const rows = await getDb()
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(
        and(
          inArray(conversationParticipants.conversationId, conversationIds),
          eq(conversationParticipants.userId, viewerId),
        ),
      );
    for (const row of rows) targets.conversations.add(row.conversationId);
  }

  return targets;
}

export async function listNotifications(
  viewerId: string,
  options: { limit: number; cursor?: string | null },
): Promise<NotificationPage> {
  if (!parseUserId(viewerId)) throw new ValidationError("Invalid account identity.");
  const cursor = decodePageCursor(options.cursor);

  try {
    const rows = await getDb()
      .select({
        id: notifications.id,
        type: notifications.type,
        entityId: notifications.entityId,
        actorId: notifications.actorId,
        actorUsername: users.username,
        actorDisplayName: profiles.displayName,
        actorAvatarUrl: profiles.avatarUrl,
        createdAt: notifications.createdAt,
        readAt: notifications.readAt,
      })
      .from(notifications)
      .innerJoin(users, eq(users.id, notifications.actorId))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(
        and(
          buildNotificationPageCondition(viewerId, cursor),
          sql`exists (
            select 1 from ${users} actor
            where actor.id = ${notifications.actorId} and actor.account_status <> 'banned'
          )`,
          sql`not exists (
            select 1 from ${userRelationships} rel
            where rel.kind = 'block'
              and (
                (rel.actor_id = ${viewerId} and rel.target_id = ${notifications.actorId})
                or (rel.actor_id = ${notifications.actorId} and rel.target_id = ${viewerId})
              )
          )`,
        ),
      )
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(options.limit + 1);

    const hasMore = rows.length > options.limit;
    const visible = (
      hasMore ? rows.slice(0, options.limit) : rows
    ).map((row) => ({ ...row, type: row.type as NotificationType }));
    const targets = await resolveTargets(viewerId, visible);
    const items: NotificationItem[] = visible.map((row) => {
      const type = row.type;
      const base = {
        id: row.id,
        type,
        entityId: row.entityId,
        actorId: row.actorId,
        actorUsername: row.actorUsername,
        actorDisplayName: row.actorDisplayName ?? row.actorUsername,
        actorAvatarUrl: row.actorAvatarUrl,
        createdAt: toIso(row.createdAt),
        readAt: row.readAt ? toIso(row.readAt) : null,
      };
      return {
        ...base,
        href: resolveNotificationHref(base, targets),
      };
    });
    const last = visible.at(-1);

    return {
      items,
      nextCursor: hasMore && last
        ? encodePageCursor({ createdAt: toIso(last.createdAt), id: last.id })
        : null,
    };
  } catch (error) {
    logServerError("db.listNotifications", error);
    throw new DatabaseError();
  }
}

export async function markNotificationRead(
  viewerId: string,
  notificationId: string,
): Promise<boolean> {
  if (!parseUserId(viewerId) || !parseUserId(notificationId)) return false;

  try {
    const result = await getDb().execute(
      buildMarkNotificationReadStatement(viewerId, notificationId),
    );
    return extractRows<RawRow>(result).length > 0;
  } catch (error) {
    logServerError("db.markNotificationRead", error, { notificationId });
    throw new DatabaseError();
  }
}

export async function markAllNotificationsRead(viewerId: string): Promise<number> {
  if (!parseUserId(viewerId)) return 0;

  try {
    const result = await getDb().execute(
      buildMarkAllNotificationsReadStatement(viewerId),
    );
    return extractRows<RawRow>(result).length;
  } catch (error) {
    logServerError("db.markAllNotificationsRead", error);
    throw new DatabaseError();
  }
}
