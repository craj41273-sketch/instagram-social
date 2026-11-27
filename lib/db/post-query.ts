import { and, desc, eq, lt, or, sql, type SQL } from "drizzle-orm";
import {
  follows,
  posts,
  profiles,
  userRelationships,
  users,
} from "@/lib/db/schema";
import type { PageCursor } from "@/lib/pagination";

/** Keyset helpers shared by the profile grid and the post feed. */

export function buildPostPageOrder(): SQL {
  return sql.join([desc(posts.createdAt), desc(posts.id)], sql`, `);
}

export function buildPostPageCondition(
  base: SQL,
  cursor: PageCursor | null,
  tag?: string | null,
): SQL {
  const conditions: SQL[] = [base];

  if (tag) {
    conditions.push(
      sql`exists (
        select 1 from post_hashtags ph
        where ph.post_id = ${posts.id} and ph.tag = ${tag}
      )`,
    );
  }

  if (cursor) {
    conditions.push(
      or(
        sql`${posts.createdAt} < ${cursor.createdAt}::timestamptz`,
        and(
          sql`${posts.createdAt} = ${cursor.createdAt}::timestamptz`,
          lt(posts.id, cursor.id),
        ),
      )!,
    );
  }

  return and(...conditions)!;
}

/** Full microsecond UTC timestamp; JavaScript Dates would lose precision. */
export const postCursorTimestamp = sql<string>`to_char(
  ${posts.createdAt} AT TIME ZONE 'UTC',
  'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
)`;

export function buildPostOwnerCondition(userId: string): SQL {
  return eq(posts.userId, userId);
}

/**
 * Pure visibility predicate shared by every post read. Own posts are always
 * visible; other posts require a non-banned author, no block edge in either
 * direction, and either a public account or an accepted follow for private ones.
 * `viewerUserId` is session-derived; null represents an anonymous visitor.
 */
export function buildPostVisibilityCondition(viewerUserId: string | null): SQL {
  return and(
    sql`exists (
      select 1 from ${users} author
      where author.id = ${posts.userId} and author.account_status <> 'banned'
    )`,
    sql`not exists (
      select 1 from ${userRelationships} rel
      where rel.kind = 'block'
        and (
          (rel.actor_id = ${viewerUserId} and rel.target_id = ${posts.userId})
          or (rel.actor_id = ${posts.userId} and rel.target_id = ${viewerUserId})
        )
    )`,
    sql`(
      ${posts.userId} = ${viewerUserId}
      or coalesce((
        select profile.is_private from ${profiles} profile
        where profile.user_id = ${posts.userId}
      ), false) = false
      or exists (
        select 1 from ${follows} f
        where f.follower_id = ${viewerUserId} and f.following_id = ${posts.userId}
      )
    )`,
  )!;
}

/**
 * Authenticated feed scope: own posts plus posts from followed accounts.
 * Identity is always supplied by the session-derived caller, never a client.
 */
export function buildSocialFeedCondition(
  viewerUserId: string,
  cursor: PageCursor | null,
  tag?: string | null,
): SQL {
  const scope = sql`
    ("posts"."user_id" = ${viewerUserId} or exists (
      select 1 from "follows" f
      where f."follower_id" = ${viewerUserId}
        and f."following_id" = "posts"."user_id"
    ))
  `;
  return buildPostPageCondition(scope, cursor, tag);
}
