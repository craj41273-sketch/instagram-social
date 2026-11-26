import { and, sql, type SQL } from "drizzle-orm";
import { stories, storyReactions, storyViews } from "@/lib/db/schema";
import { buildStoryVisibilityCondition } from "@/lib/db/story-query";

/**
 * Parameterized mutation statements. Each write rechecks story existence,
 * expiration, and follow visibility in the same statement as the insert.
 */

/** Owners do not view their own stories; duplicates are a harmless no-op. */
export function buildRecordStoryViewStatement(
  storyId: string,
  viewerId: string,
  nowIso: string,
): SQL {
  const condition = and(
    buildStoryVisibilityCondition(viewerId, nowIso),
    sql`${stories.userId} <> ${viewerId}`,
  );

  return sql`
    INSERT INTO ${storyViews} (story_id, viewer_id, viewed_at)
    SELECT stories.id, ${viewerId}, ${nowIso}::timestamptz
    FROM stories
    WHERE stories.id = ${storyId} AND ${condition}
    ON CONFLICT (story_id, viewer_id) DO NOTHING
    RETURNING id
  `;
}

export function buildSetStoryReactionStatement(
  storyId: string,
  userId: string,
  emoji: string,
  nowIso: string,
): SQL {
  return sql`
    INSERT INTO ${storyReactions} (story_id, user_id, emoji, created_at, updated_at)
    SELECT stories.id, ${userId}, ${emoji}, ${nowIso}::timestamptz, ${nowIso}::timestamptz
    FROM stories
    WHERE stories.id = ${storyId}
      AND ${buildStoryVisibilityCondition(userId, nowIso)}
    ON CONFLICT (story_id, user_id) DO UPDATE
    SET emoji = excluded.emoji, updated_at = excluded.updated_at
    RETURNING id
  `;
}

/** Removal only needs the reactor's own row; it cannot affect another user. */
export function buildRemoveStoryReactionStatement(
  storyId: string,
  userId: string,
): SQL {
  return sql`
    DELETE FROM ${storyReactions}
    WHERE story_id = ${storyId} AND user_id = ${userId}
    RETURNING id
  `;
}
