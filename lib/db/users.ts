import "server-only";
import { and, asc, eq, ilike, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { follows, profiles, users } from "@/lib/db/schema";
import { DatabaseError } from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import { userSearchQuerySchema } from "@/lib/validations/profile";

export async function findUserByUsername(username: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return rows[0] ?? null;
}

export async function findUserById(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function findUserByAuthUserId(authUserId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.authUserId, authUserId))
    .limit(1);
  return rows[0] ?? null;
}

/** Joins the server-derived Supabase identity to its application profile. */
export async function getAppUserWithProfile(authUserId: string) {
  const db = getDb();
  const rows = await db
    .select({ user: users, profile: profiles })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.authUserId, authUserId))
    .limit(1);
  return rows[0] ?? null;
}

/** Public search projection; email and Supabase identity are never selected. */
export interface UserSearchResult {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface UserSearchPage {
  items: UserSearchResult[];
  hasMore: boolean;
  nextOffset: number | null;
}

/** Suggestions use the same safe shape as a follow-list row. */
export interface SuggestedUser {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isFollowing: false;
  followedAt: string;
}

/** LIKE patterns treat these as wildcards; search input must remain literal. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

/**
 * Real, unfollowed accounts ordered by existing follower count. The viewer ID
 * always comes from the DAL and is never accepted from the request.
 */
export async function getSuggestedUsers(
  viewerUserId: string,
  limit = 6,
): Promise<SuggestedUser[]> {
  const safeLimit = Math.min(12, Math.max(1, Math.floor(limit)));
  const parsed = z.uuid().safeParse(viewerUserId);
  if (!parsed.success) return [];

  try {
    const rows = await getDb()
      .select({
        userId: users.id,
        username: users.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        followedAt: users.createdAt,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(
        and(
          ne(users.id, parsed.data),
          sql`not exists (
            select 1 from ${follows} f
            where f.follower_id = ${parsed.data} and f.following_id = ${users.id}
          )`,
        ),
      )
      .orderBy(asc(users.username))
      .limit(safeLimit);

    return rows.map((row) => ({
      userId: row.userId,
      username: row.username,
      displayName: row.displayName ?? row.username,
      avatarUrl: row.avatarUrl,
      isFollowing: false as const,
      followedAt: row.followedAt.toISOString(),
    }));
  } catch (error) {
    logServerError("db.getSuggestedUsers", error, { userId: parsed.data });
    throw new DatabaseError();
  }
}

/**
 * Bounded, case-insensitive username prefix lookup. Requires the caller to be
 * authenticated and rate-limited at the route boundary; this function only
 * returns fields safe for another user to see.
 */
export async function searchUsersByUsername(
  query: string,
  limit: number,
  offset: number,
  excludeUserId?: string | null,
): Promise<UserSearchPage> {
  const parsed = userSearchQuerySchema.safeParse({
    q: query,
    limit,
    offset,
  });
  if (!parsed.success) return { items: [], hasMore: false, nextOffset: null };

  const { q, limit: safeLimit, offset: safeOffset } = parsed.data;

  try {
    const rows = await getDb()
      .select({
        userId: users.id,
        username: users.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(
        and(
          ilike(users.username, `${escapeLike(q)}%`),
          excludeUserId ? ne(users.id, excludeUserId) : undefined,
        ),
      )
      .orderBy(asc(users.username), asc(users.id))
      .limit(safeLimit + 1)
      .offset(safeOffset);

    const hasMore = rows.length > safeLimit;
    const items = rows.slice(0, safeLimit).map((row) => ({
      userId: row.userId,
      username: row.username,
      displayName: row.displayName ?? row.username,
      avatarUrl: row.avatarUrl,
    }));

    return {
      items,
      hasMore,
      nextOffset: hasMore ? safeOffset + safeLimit : null,
    };
  } catch (error) {
    logServerError("db.searchUsersByUsername", error, { queryLength: q.length });
    throw new DatabaseError();
  }
}
