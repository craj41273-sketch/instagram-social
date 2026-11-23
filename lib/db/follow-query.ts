import { and, desc, lt, or, sql, type SQL } from "drizzle-orm";
import { follows } from "@/lib/db/schema";
import type { FollowCursor } from "@/lib/pagination";

/**
 * Keyset helpers for follow lists. The cursor carries PostgreSQL's full
 * microsecond timestamp string; comparing that exact string avoids skipping
 * rows whose timestamps share the same JavaScript millisecond.
 */

export function buildFollowPageOrder(): SQL {
  return sql.join([desc(follows.createdAt), desc(follows.id)], sql`, `);
}

export function buildFollowPageCondition(
  base: SQL,
  cursor: FollowCursor | null,
): SQL | undefined {
  if (!cursor) return base;

  return and(
    base,
    or(
      sql`${follows.createdAt} < ${cursor.createdAt}::timestamptz`,
      and(
        sql`${follows.createdAt} = ${cursor.createdAt}::timestamptz`,
        lt(follows.id, cursor.id),
      ),
    ),
  );
}

/** Full-precision UTC string used in cursors; display still uses JS ISO strings. */
export const followCursorTimestamp = sql<string>`to_char(
  ${follows.createdAt} AT TIME ZONE 'UTC',
  'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
)`;
