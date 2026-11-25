import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  follows,
  posts,
  postLikes,
  postMedia,
  comments,
  postHashtags,
  profiles,
  users,
} from "@/lib/db/schema";
import {
  buildPeopleSearchCondition,
  buildPostSearchCondition,
  buildRecentTagCondition,
  buildTrendingCondition,
} from "@/lib/db/discovery-query";
import { parseUserId } from "@/lib/db/profile-sql";
import {
  TRENDING_CANDIDATE_LIMIT,
  rankTrendingPosts,
  type TrendingCandidate,
} from "@/lib/discovery/ranking";
import type {
  ExploreTag,
  SearchPage,
  SearchPerson,
  SearchPost,
  TrendingPost,
} from "@/lib/discovery/types";
import { DatabaseError } from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import { discoveryQuerySchema } from "@/lib/validations/discovery";

/** Server-owned discovery projections; every result is a real database row. */

interface RawRow {
  [key: string]: unknown;
}

function extractRows(result: unknown): RawRow[] {
  if (Array.isArray(result)) return result as RawRow[];
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    return Array.isArray(rows) ? (rows as RawRow[]) : [];
  }
  return [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numeric(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(text(value));
  return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
}

function emptyPage<T>(): SearchPage<T> {
  return { items: [], hasMore: false, nextOffset: null };
}

function pageFromRows<T>(
  rows: RawRow[],
  limit: number,
  offset: number,
  map: (row: RawRow) => T,
): SearchPage<T> {
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(map);
  return {
    items,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
  };
}

/** Case-insensitive username/display-name search with viewer follow state. */
export async function searchPeople(
  input: { query: string; limit?: number; offset?: number },
  viewerUserId: string | null,
): Promise<SearchPage<SearchPerson>> {
  const parsed = discoveryQuerySchema.safeParse(input);
  if (!parsed.success) return emptyPage();

  const { q, limit, offset } = parsed.data;
  const following = parseUserId(viewerUserId ?? "")
    ? sql`exists (
        select 1 from ${follows} f
        where f.follower_id = ${viewerUserId} and f.following_id = u.id
      )`
    : sql`false`;

  try {
    const result = await getDb().execute<RawRow>(sql`
      SELECT
        u.id AS user_id,
        u.username AS username,
        p.display_name AS display_name,
        p.avatar_url AS avatar_url,
        p.bio AS bio,
        ${following} AS is_following
      FROM ${users} u
      LEFT JOIN ${profiles} p ON p.user_id = u.id
      WHERE ${buildPeopleSearchCondition(q)}
      ORDER BY u.username ASC, u.id ASC
      LIMIT ${limit + 1} OFFSET ${offset}
    `);

    return pageFromRows(
      extractRows(result),
      limit,
      offset,
      (row): SearchPerson => ({
        userId: text(row.user_id),
        username: text(row.username),
        displayName: text(row.display_name) || text(row.username),
        avatarUrl: nullableText(row.avatar_url),
        bio: nullableText(row.bio),
        isFollowing: row.is_following === true,
      }),
    );
  } catch (error) {
    logServerError("db.searchPeople", error, { queryLength: q.length });
    throw new DatabaseError();
  }
}

/** Case-insensitive caption search; count and media come from one bounded query. */
export async function searchPosts(
  input: { query: string; limit?: number; offset?: number },
): Promise<SearchPage<SearchPost>> {
  const parsed = discoveryQuerySchema.safeParse(input);
  if (!parsed.success) return emptyPage();

  const { q, limit, offset } = parsed.data;

  try {
    const result = await getDb().execute<RawRow>(sql`
      SELECT
        posts.id AS post_id,
        posts.caption AS caption,
        to_char(posts.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor,
        (
          SELECT pm.public_url FROM ${postMedia} pm
          WHERE pm.post_id = posts.id
          ORDER BY pm.position ASC LIMIT 1
        ) AS thumbnail_url,
        (
          SELECT count(*)::int FROM ${postMedia} pm WHERE pm.post_id = posts.id
        ) AS media_count,
        (
          SELECT count(*)::int FROM ${postLikes} pl WHERE pl.post_id = posts.id
        ) AS like_count,
        u.username AS author_username,
        coalesce(p.display_name, u.username) AS author_display_name,
        p.avatar_url AS author_avatar_url
      FROM ${posts}
      INNER JOIN ${users} u ON u.id = posts.user_id
      LEFT JOIN ${profiles} p ON p.user_id = u.id
      WHERE ${buildPostSearchCondition(q)}
      ORDER BY posts.created_at DESC, posts.id DESC
      LIMIT ${limit + 1} OFFSET ${offset}
    `);

    return pageFromRows(
      extractRows(result),
      limit,
      offset,
      (row): SearchPost => ({
        postId: text(row.post_id),
        caption: text(row.caption),
        createdAt: toIso(row.cursor),
        thumbnailUrl: nullableText(row.thumbnail_url),
        mediaCount: numeric(row.media_count),
        likeCount: numeric(row.like_count),
        authorUsername: text(row.author_username),
        authorDisplayName: text(row.author_display_name),
        authorAvatarUrl: nullableText(row.author_avatar_url),
      }),
    );
  } catch (error) {
    logServerError("db.searchPosts", error, { queryLength: q.length });
    throw new DatabaseError();
  }
}

/** Real hashtags from recent posts; no predefined or invented categories. */
export async function getExploreTags(limit = 8): Promise<ExploreTag[]> {
  const safeLimit = Math.min(12, Math.max(1, Math.floor(limit)));

  try {
    const result = await getDb().execute<RawRow>(sql`
      SELECT h.tag AS tag, count(*)::int AS count
      FROM ${postHashtags} h
      INNER JOIN ${posts} ON posts.id = h.post_id
      WHERE ${buildRecentTagCondition()}
      GROUP BY h.tag
      ORDER BY count DESC, h.tag ASC
      LIMIT ${safeLimit}
    `);

    return (result.rows ?? []).map((row) => ({
      tag: text(row.tag),
      count: numeric(row.count),
    }));
  } catch (error) {
    logServerError("db.getExploreTags", error);
    throw new DatabaseError();
  }
}

/** Bounded recent-post candidates ranked from real likes/comments in JS. */
export async function getTrendingPosts(limit = 6): Promise<TrendingPost[]> {
  const safeLimit = Math.min(12, Math.max(1, Math.floor(limit)));

  try {
    const result = await getDb().execute<RawRow>(sql`
      SELECT
        posts.id AS post_id,
        posts.caption AS caption,
        to_char(posts.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor,
        (
          SELECT pm.public_url FROM ${postMedia} pm
          WHERE pm.post_id = posts.id
          ORDER BY pm.position ASC LIMIT 1
        ) AS thumbnail_url,
        (
          SELECT count(*)::int FROM ${postMedia} pm WHERE pm.post_id = posts.id
        ) AS media_count,
        (
          SELECT count(*)::int FROM ${postLikes} pl WHERE pl.post_id = posts.id
        ) AS like_count,
        (
          SELECT count(*)::int FROM ${comments} c WHERE c.post_id = posts.id
        ) AS comment_count,
        u.username AS author_username,
        coalesce(p.display_name, u.username) AS author_display_name,
        p.avatar_url AS author_avatar_url
      FROM ${posts}
      INNER JOIN ${users} u ON u.id = posts.user_id
      LEFT JOIN ${profiles} p ON p.user_id = u.id
      WHERE ${buildTrendingCondition()}
      ORDER BY posts.created_at DESC
      LIMIT ${TRENDING_CANDIDATE_LIMIT}
    `);

    const candidates = (result.rows ?? []).map(
      (row): TrendingCandidate & Omit<SearchPost, "postId" | "createdAt"> => ({
        postId: text(row.post_id),
        caption: text(row.caption),
        createdAt: toIso(row.cursor),
        thumbnailUrl: nullableText(row.thumbnail_url),
        mediaCount: numeric(row.media_count),
        likeCount: numeric(row.like_count),
        commentCount: numeric(row.comment_count),
        authorUsername: text(row.author_username),
        authorDisplayName: text(row.author_display_name),
        authorAvatarUrl: nullableText(row.author_avatar_url),
      }),
    );

    const byId = new Map(candidates.map((item) => [item.postId, item]));
    return rankTrendingPosts(candidates, safeLimit).flatMap((ranked) => {
      const candidate = byId.get(ranked.postId);
      return candidate
        ? [
            {
              ...candidate,
              ageHours: ranked.ageHours,
              score: ranked.score,
            },
          ]
        : [];
    });
  } catch (error) {
    logServerError("db.getTrendingPosts", error);
    throw new DatabaseError();
  }
}
