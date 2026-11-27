import { and, eq, gt, sql, type SQL } from "drizzle-orm";
import {
  closeFriends,
  follows,
  stories,
  storyAudienceEntries,
  userRelationships,
  users,
} from "@/lib/db/schema";

/**
 * Pure, server-side query fragments. Every value stays parameterized so tests
 * can verify expiration and follow visibility without a live database.
 */

/** Active means `expires_at > now`; owners always see their own stories. */
export function buildStoryAccessCondition(
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

/** Audience is per story; blocks and explicit exclusions win over every setting. */
export function buildStoryAudienceCondition(viewerUserId: string): SQL {
  return sql`(
    ${stories.userId} = ${viewerUserId}
    or (
      exists (select 1 from ${users} author where author.id = ${stories.userId} and author.account_status <> 'banned')
      and not exists (
        select 1 from ${userRelationships} rel
        where rel.kind = 'block'
          and (
            (rel.actor_id = ${viewerUserId} and rel.target_id = ${stories.userId})
            or (rel.actor_id = ${stories.userId} and rel.target_id = ${viewerUserId})
          )
      )
      and not exists (
        select 1 from ${storyAudienceEntries} entry
        where entry.story_id = ${stories.id}
          and entry.user_id = ${viewerUserId}
          and entry.kind = 'exclude'
      )
      and (
        (
          ${stories.audience} = 'followers'
          and exists (
            select 1 from ${follows} audience_follow
            where audience_follow.follower_id = ${viewerUserId}
              and audience_follow.following_id = ${stories.userId}
          )
        )
        or (
          ${stories.audience} = 'close_friends'
          and exists (
            select 1 from ${closeFriends} friend
            where friend.owner_id = ${stories.userId} and friend.member_id = ${viewerUserId}
          )
        )
        or (
          ${stories.audience} = 'custom'
          and exists (
            select 1 from ${storyAudienceEntries} include_entry
            where include_entry.story_id = ${stories.id}
              and include_entry.user_id = ${viewerUserId}
              and include_entry.kind = 'include'
          )
        )
      )
    )
  )`;
}

/** Full read visibility: access plus audience/exclusions/blocks. */
export function buildStoryVisibilityCondition(
  viewerUserId: string,
  nowIso: string,
  targetUserId?: string | null,
): SQL {
  return and(
    buildStoryAccessCondition(viewerUserId, nowIso, targetUserId),
    buildStoryAudienceCondition(viewerUserId),
  )!;
}

/** Ownership predicate shared by viewer-list and delete operations. */
export function buildOwnedStoryCondition(storyId: string, ownerId: string): SQL {
  return and(eq(stories.id, storyId), eq(stories.userId, ownerId))!;
}
