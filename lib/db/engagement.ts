import "server-only";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { comments, postLikes, posts, profiles, users } from "@/lib/db/schema";
import { parseUserId } from "@/lib/db/profile-sql";
import { DatabaseError, ValidationError } from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import { decodePageCursor, encodePageCursor, type PageCursor } from "@/lib/pagination";
import { commentContentSchema } from "@/lib/validations/post";

/** Server-owned engagement projections. Counts are never accepted from clients. */

export interface LikeState {
  liked: boolean;
  likeCount: number;
}

export interface PublicComment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
}

export interface CommentPage {
  items: PublicComment[];
  nextCursor: string | null;
}

/** Cursors are bound as text so full microsecond precision survives paging. */
function commentPageCondition(cursor: PageCursor | null): SQL | undefined {
  if (!cursor) return undefined;
  return sql`(
    ${comments.createdAt} < ${cursor.createdAt}::timestamptz
    or (${comments.createdAt} = ${cursor.createdAt}::timestamptz and ${comments.id} < ${cursor.id})
  )`;
}

async function postExists(postId: string): Promise<boolean> {
  const rows = await getDb()
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  return rows.length > 0;
}

async function readLikeState(postId: string, userId: string): Promise<LikeState> {
  const rows = await getDb()
    .select({
      likeCount: sql<number>`count(*)::int`,
      liked: sql<boolean>`coalesce(bool_or(${postLikes.userId} = ${userId}), false)`,
    })
    .from(postLikes)
    .where(eq(postLikes.postId, postId));
  return {
    liked: rows[0]?.liked ?? false,
    likeCount: rows[0]?.likeCount ?? 0,
  };
}

/** Idempotent insert; the unique (user, post) index absorbs duplicate requests. */
export async function likePost(
  postId: string,
  userId: string,
): Promise<LikeState | null> {
  if (!parseUserId(postId) || !parseUserId(userId)) {
    throw new ValidationError("Invalid like identity.");
  }

  try {
    if (!(await postExists(postId))) return null;
    await getDb()
      .insert(postLikes)
      .values({ postId, userId })
      .onConflictDoNothing();
    return readLikeState(postId, userId);
  } catch (error) {
    logServerError("db.likePost", error, { postId });
    throw new DatabaseError();
  }
}

/** Deletes only the session user's own like; repeated calls are harmless. */
export async function unlikePost(
  postId: string,
  userId: string,
): Promise<LikeState | null> {
  if (!parseUserId(postId) || !parseUserId(userId)) {
    throw new ValidationError("Invalid like identity.");
  }

  try {
    if (!(await postExists(postId))) return null;
    await getDb()
      .delete(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
    return readLikeState(postId, userId);
  } catch (error) {
    logServerError("db.unlikePost", error, { postId });
    throw new DatabaseError();
  }
}

export async function isPostLikedBy(postId: string, userId: string): Promise<boolean> {
  if (!parseUserId(postId) || !parseUserId(userId)) return false;

  try {
    const rows = await getDb()
      .select({ id: postLikes.id })
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
      .limit(1);
    return rows.length > 0;
  } catch (error) {
    logServerError("db.isPostLikedBy", error, { postId });
    throw new DatabaseError();
  }
}

export async function getPostLikeCount(postId: string): Promise<number> {
  if (!parseUserId(postId)) return 0;

  try {
    const rows = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(postLikes)
      .where(eq(postLikes.postId, postId));
    return rows[0]?.count ?? 0;
  } catch (error) {
    logServerError("db.getPostLikeCount", error, { postId });
    throw new DatabaseError();
  }
}

async function readComment(commentId: string): Promise<PublicComment | null> {
  const rows = await getDb()
    .select({
      id: comments.id,
      postId: comments.postId,
      userId: comments.userId,
      username: users.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      content: comments.content,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.userId))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(comments.id, commentId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    displayName: row.displayName ?? row.username,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getCommentCount(postId: string): Promise<number> {
  if (!parseUserId(postId)) return 0;

  try {
    const rows = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(comments)
      .where(eq(comments.postId, postId));
    return rows[0]?.count ?? 0;
  } catch (error) {
    logServerError("db.getCommentCount", error, { postId });
    throw new DatabaseError();
  }
}

/** Creates a comment with session-derived ownership and returns the new row. */
export async function createComment(
  postId: string,
  userId: string,
  content: string,
): Promise<{ comment: PublicComment; commentCount: number } | null> {
  if (!parseUserId(postId) || !parseUserId(userId)) {
    throw new ValidationError("Invalid comment identity.");
  }
  const parsed = commentContentSchema.safeParse(content);
  if (!parsed.success) return null;

  try {
    if (!(await postExists(postId))) return null;
    const inserted = await getDb()
      .insert(comments)
      .values({ postId, userId, content: parsed.data })
      .returning({ id: comments.id });
    const comment = await readComment(inserted[0]!.id);
    if (!comment) return null;
    return { comment, commentCount: await getCommentCount(postId) };
  } catch (error) {
    logServerError("db.createComment", error, { postId });
    throw new DatabaseError();
  }
}

/** Owner-scoped delete; non-owners and unknown IDs return null. */
export async function deleteOwnComment(
  commentId: string,
  userId: string,
): Promise<{ postId: string; commentCount: number } | null> {
  if (!parseUserId(commentId) || !parseUserId(userId)) {
    throw new ValidationError("Invalid comment identity.");
  }

  try {
    const deleted = await getDb()
      .delete(comments)
      .where(and(eq(comments.id, commentId), eq(comments.userId, userId)))
      .returning({ postId: comments.postId });
    const postId = deleted[0]?.postId;
    if (!postId) return null;
    return { postId, commentCount: await getCommentCount(postId) };
  } catch (error) {
    logServerError("db.deleteOwnComment", error, { commentId });
    throw new DatabaseError();
  }
}

/** Newest-first, keyset-paginated comments with author projections in one join. */
export async function listComments(
  postId: string,
  options: { limit?: number; cursor?: string | null } = {},
): Promise<CommentPage> {
  if (!parseUserId(postId)) return { items: [], nextCursor: null };

  const limit = Math.min(24, Math.max(1, Math.floor(options.limit ?? 12)));
  const pageCondition = commentPageCondition(decodePageCursor(options.cursor));

  try {
    const rows = await getDb()
      .select({
        id: comments.id,
        postId: comments.postId,
        userId: comments.userId,
        username: users.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        content: comments.content,
        createdAt: comments.createdAt,
        cursor: sql<string>`to_char(
          ${comments.createdAt} AT TIME ZONE 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
        )`,
      })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.userId))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(and(eq(comments.postId, postId), pageCondition))
      .orderBy(desc(comments.createdAt), desc(comments.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);
    return {
      items: pageRows.map((row) => ({
        id: row.id,
        postId: row.postId,
        userId: row.userId,
        username: row.username,
        displayName: row.displayName ?? row.username,
        avatarUrl: row.avatarUrl,
        content: row.content,
        createdAt: row.createdAt.toISOString(),
      })),
      nextCursor:
        hasMore && pageRows.at(-1)
          ? encodePageCursor({ createdAt: pageRows.at(-1)!.cursor, id: pageRows.at(-1)!.id })
          : null,
    };
  } catch (error) {
    logServerError("db.listComments", error, { postId });
    throw new DatabaseError();
  }
}
