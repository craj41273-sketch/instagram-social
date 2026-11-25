import { and, desc, eq, lt, or, sql, type SQL } from "drizzle-orm";
import { posts } from "@/lib/db/schema";
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
