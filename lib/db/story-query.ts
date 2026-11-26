import { and, eq, gt, sql, type SQL } from "drizzle-orm";
import { follows, stories } from "@/lib/db/schema";

/**
 * Pure, server-side query fragments. Every value stays parameterized so tests
 * can verify expiration and follow visibility without a live database.
 */

/**
 * Active means `expires_at > now`. Viewer access follows the existing feed
 * rule: a user may always read their own stories, otherwise an accepted follow
 * edge is required. No private-account flag exists in the current schema.
 */
export function buildStoryVisibilityCondition(
  viewerUserId: string,
  nowIso: string,
  targetUserId?: string | null,
): SQL {
  const conditions: SQL[] = [
    gt(stories.expiresAt, sql`${nowIso}::timestamptz`),
    sql`(
      ${stories.userId} = ${viewerUserId}
      OR EXISTS (
        SELECT 1 FROM ${follows}
        WHERE ${follows.followerId} = ${viewerUserId}
          AND ${follows.followingId} = ${stories.userId}
      )
    )`,
  ];

  if (targetUserId) conditions.push(eq(stories.userId, targetUserId));
  return and(...conditions)!;
}

/** Ownership predicate shared by viewer-list and delete operations. */
export function buildOwnedStoryCondition(storyId: string, ownerId: string): SQL {
  return and(eq(stories.id, storyId), eq(stories.userId, ownerId))!;
}
