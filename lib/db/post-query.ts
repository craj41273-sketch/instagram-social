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
