import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { follows, profiles, users } from "@/lib/db/schema";
import {
  buildFollowPageCondition,
  buildFollowPageOrder,
  followCursorTimestamp,
} from "@/lib/db/follow-query";
import { parseUserId } from "@/lib/db/profile-sql";
import {
  DatabaseError,
  ValidationError,
  isUniqueViolation,
} from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import { LIST_PAGE_SIZE, decodeFollowCursor, encodeFollowCursor } from "@/lib/pagination";

export interface FollowResult {
  following: boolean;
  alreadyFollowing: boolean;
}

export interface SocialUserItem {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isFollowing: boolean;
  followedAt: string;
}

export interface SocialUserPage {
  items: SocialUserItem[];
  nextCursor: string | null;
}

interface ListFollowsOptions {
  viewerUserId?: string | null;
  limit?: number;
  cursor?: string | null;
}

function isCheckViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23514"
  );
}

function validatePair(followerId: string, followingId: string): void {
  if (!parseUserId(followerId) || !parseUserId(followingId)) {
    throw new ValidationError("Invalid account identity.");
  }
  if (followerId === followingId) {
    throw new ValidationError("You cannot follow yourself.");
  }
}

async function usersExist(userIds: string[]): Promise<boolean> {
  const rows = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.id, userIds));
  return rows.length === userIds.length;
}

/** Creates a server-derived follow edge. Duplicate requests are idempotent. */
export async function followUser(
  followerId: string,
  followingId: string,
): Promise<FollowResult> {
  validatePair(followerId, followingId);

  try {
    if (!(await usersExist([followerId, followingId]))) {
      throw new ValidationError("That user is not available.");
    }

    const inserted = await getDb()
      .insert(follows)
      .values({ followerId, followingId })
      .onConflictDoNothing()
      .returning({ id: follows.id });

    return {
      following: inserted.length > 0,
      alreadyFollowing: inserted.length === 0,
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    if (isUniqueViolation(error)) {
      return { following: false, alreadyFollowing: true };
    }
    if (isCheckViolation(error)) {
      throw new ValidationError("You cannot follow yourself.");
    }
    logServerError("db.followUser", error, { followerId, followingId });
    throw new DatabaseError();
  }
}

/** Removes only the viewer's own edge; repeated calls are successful no-ops. */
export async function unfollowUser(
  followerId: string,
  followingId: string,
): Promise<{ removed: boolean }> {
  validatePair(followerId, followingId);

  try {
    const removed = await getDb()
      .delete(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId),
        ),
      )
      .returning({ id: follows.id });
    return { removed: removed.length > 0 };
  } catch (error) {
    logServerError("db.unfollowUser", error, { followerId, followingId });
    throw new DatabaseError();
  }
}

/** Reads the actual database relationship for the current viewer. */
export async function isFollowing(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  if (!parseUserId(followerId) || !parseUserId(followingId)) return false;
  if (followerId === followingId) return false;

  try {
    const rows = await getDb()
      .select({ id: follows.id })
      .from(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId),
        ),
      )
      .limit(1);
    return rows.length > 0;
  } catch (error) {
    logServerError("db.isFollowing", error, { followerId, followingId });
    throw new DatabaseError();
  }
}

/** Two indexed scalar subqueries in one round trip; no hardcoded statistics. */
export async function getFollowCounts(
  userId: string,
): Promise<{ followers: number; following: number }> {
  if (!parseUserId(userId)) return { followers: 0, following: 0 };

  try {
    const result = await getDb().execute<{ followers: number; following: number }>(sql`
      SELECT
        (SELECT count(*)::int FROM "follows" WHERE "following_id" = ${userId}) AS followers,
        (SELECT count(*)::int FROM "follows" WHERE "follower_id" = ${userId}) AS following
    `);
    const row = Array.isArray(result)
      ? result[0]
      : ((result as { rows?: Array<{ followers: number; following: number }> }).rows?.[0] ??
        undefined);

    return {
      followers: Number(row?.followers ?? 0),
      following: Number(row?.following ?? 0),
    };
  } catch (error) {
    logServerError("db.getFollowCounts", error, { userId });
    throw new DatabaseError();
  }
}

async function listFollowEdges(
  direction: "followers" | "following",
  targetUserId: string,
  options: ListFollowsOptions,
): Promise<SocialUserPage> {
  if (!parseUserId(targetUserId)) {
    throw new ValidationError("Invalid profile identity.");
  }

  const limit = Math.min(Math.max(options.limit ?? LIST_PAGE_SIZE, 1), 24);
  const cursor = decodeFollowCursor(options.cursor);

  const targetCondition =
    direction === "followers"
      ? eq(follows.followingId, targetUserId)
      : eq(follows.followerId, targetUserId);
  const userIdColumn = direction === "followers" ? follows.followerId : follows.followingId;
  const condition = buildFollowPageCondition(targetCondition, cursor);

  try {
    const rows = await getDb()
      .select({
        followId: follows.id,
        followedAt: follows.createdAt,
        cursorCreatedAt: followCursorTimestamp,
        userId: users.id,
        username: users.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      })
      .from(follows)
      .innerJoin(users, eq(users.id, userIdColumn))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(condition)
      .orderBy(buildFollowPageOrder())
      .limit(limit + 1);

    const pageRows = rows.slice(0, limit);
    const candidateIds = pageRows.map((row) => row.userId);
    const viewerId = options.viewerUserId ? parseUserId(options.viewerUserId) : null;

    let followingIds = new Set<string>();
    if (viewerId && candidateIds.length > 0) {
      const statusRows = await getDb()
        .select({ id: follows.followingId })
        .from(follows)
        .where(
          and(
            eq(follows.followerId, viewerId),
            inArray(follows.followingId, candidateIds),
          ),
        );
      followingIds = new Set(statusRows.map((row) => row.id));
    }

    const items: SocialUserItem[] = pageRows.map((row) => ({
      userId: row.userId,
      username: row.username,
      displayName: row.displayName ?? row.username,
      avatarUrl: row.avatarUrl,
      isFollowing: followingIds.has(row.userId),
      followedAt: row.followedAt.toISOString(),
    }));

    const last = rows[limit - 1];
    const nextCursor =
      rows.length > limit && last
        ? encodeFollowCursor({
            createdAt: last.cursorCreatedAt,
            id: last.followId,
          })
        : null;

    return { items, nextCursor };
  } catch (error) {
    logServerError("db.listFollowEdges", error, {
      direction,
      targetUserId,
    });
    throw new DatabaseError();
  }
}

export function listFollowers(
  targetUserId: string,
  options: ListFollowsOptions = {},
): Promise<SocialUserPage> {
  return listFollowEdges("followers", targetUserId, options);
}

export function listFollowing(
  targetUserId: string,
  options: ListFollowsOptions = {},
): Promise<SocialUserPage> {
  return listFollowEdges("following", targetUserId, options);
}
