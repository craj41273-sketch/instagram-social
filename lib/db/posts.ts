import "server-only";
import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  comments,
  postHashtags,
  postMedia,
  posts,
  profilePrivacySettings,
  profiles,
  users,
  type NewPostMedia,
} from "@/lib/db/schema";
import {
  buildPostPageCondition,
  buildPostPageOrder,
  buildPostVisibilityCondition,
  buildSocialFeedCondition,
  postCursorTimestamp,
} from "@/lib/db/post-query";
import { parseUserId } from "@/lib/db/profile-sql";
import { filterCommentsForViewer } from "@/lib/db/engagement";
import { DatabaseError, ValidationError } from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import { decodePageCursor, encodePageCursor } from "@/lib/pagination";
import { extractHashtags } from "@/lib/posts/hashtags";

/** Safe projections for profile grids, feeds, and post detail pages. */

export interface ProfilePostItem {
  postId: string;
  caption: string;
  createdAt: string;
  thumbnailUrl: string | null;
  mediaCount: number;
}

export interface ProfilePostPage {
  items: ProfilePostItem[];
  nextCursor: string | null;
}

export interface PublicPostMedia {
  id: string;
  publicUrl: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  position: number;
}

export interface PublicPostAuthor {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface CommentPreview {
  id: string;
  username: string;
  displayName: string;
  content: string;
  createdAt: string;
}

export interface PublicPost {
  id: string;
  author: PublicPostAuthor;
  caption: string;
  hashtags: string[];
  createdAt: string;
  updatedAt: string;
  media: PublicPostMedia[];
  likeCount: number;
  likedByViewer: boolean;
  commentCount: number;
  commentPreviews: CommentPreview[];
}

export interface PublicPostPage {
  items: PublicPost[];
  nextCursor: string | null;
}

interface RawRow {
  [key: string]: unknown;
}

function extractRows<T extends RawRow>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    return Array.isArray(rows) ? (rows as T[]) : [];
  }
  return [];
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date(0).toISOString();
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

function safeLimit(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(24, Math.max(1, Math.floor(value ?? fallback)));
}

/** One batched lookup keeps count suppression out of per-post queries. */
export async function loadHiddenLikeAuthors(authorIds: string[]): Promise<Set<string>> {
  const ids = [...new Set(authorIds)].filter(parseUserId);
  if (ids.length === 0) return new Set();
  const rows = await getDb()
    .select({ userId: profilePrivacySettings.userId })
    .from(profilePrivacySettings)
    .where(
      and(
        inArray(profilePrivacySettings.userId, ids),
        eq(profilePrivacySettings.hideLikeCounts, true),
      ),
    );
  return new Set(rows.map((row) => row.userId));
}

/** Counts real post rows for the profile stat. */
export async function getPostCountByUserId(userId: string): Promise<number> {
  if (!parseUserId(userId)) throw new ValidationError("Invalid account identity.");

  try {
    const result = await getDb().execute<{ count: number | string }>(sql`
      SELECT count(*)::int AS count FROM "posts" WHERE "user_id" = ${userId}
    `);
    return numeric(extractRows<{ count: number | string }>(result)[0]?.count);
  } catch (error) {
    logServerError("db.getPostCountByUserId", error, { userId });
    throw new DatabaseError();
  }
}

/** First page of real posts for a public profile grid. */
export async function listProfilePosts(
  userId: string,
  options: { limit?: number; cursor?: string | null; viewerUserId?: string | null } = {},
): Promise<ProfilePostPage> {
  if (!parseUserId(userId)) throw new ValidationError("Invalid account identity.");

  const limit = safeLimit(options.limit, 12);
  const cursor = decodePageCursor(options.cursor);
  const condition = and(
    buildPostPageCondition(eq(posts.userId, userId), cursor),
    buildPostVisibilityCondition(options.viewerUserId ?? null),
  )!;

  try {
    const result = await getDb().execute<RawRow>(sql`
      SELECT
        "posts"."id" AS post_id,
        "posts"."caption" AS caption,
        ${postCursorTimestamp} AS cursor,
        (
          SELECT pm."public_url" FROM "post_media" pm
          WHERE pm."post_id" = "posts"."id"
          ORDER BY pm."position" ASC LIMIT 1
        ) AS thumbnail_url,
        (
          SELECT count(*)::int FROM "post_media" pm
          WHERE pm."post_id" = "posts"."id"
        ) AS media_count
      FROM "posts"
      WHERE ${condition}
      ORDER BY ${buildPostPageOrder()}
      LIMIT ${limit + 1}
    `);

    const rows = extractRows<RawRow>(result);
    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);
    const items = pageRows.map((row) => ({
      postId: text(row.post_id),
      caption: text(row.caption),
      createdAt: toIso(row.cursor),
      thumbnailUrl: nullableText(row.thumbnail_url),
      mediaCount: numeric(row.media_count),
    }));
    const lastRow = pageRows.at(-1);

    return {
      items,
      nextCursor:
        hasMore && lastRow
          ? encodePageCursor({ createdAt: text(lastRow.cursor), id: text(lastRow.post_id) })
          : null,
    };
  } catch (error) {
    logServerError("db.listProfilePosts", error, { userId });
    throw new DatabaseError();
  }
}

/** Creates an owned post row with a caller-generated ID for storage paths. */
export async function createPostRecord(input: {
  id: string;
  userId: string;
  caption: string;
}): Promise<void> {
  if (!parseUserId(input.id) || !parseUserId(input.userId)) {
    throw new ValidationError("Invalid post identity.");
  }

  try {
    await getDb()
      .insert(posts)
      .values({ id: input.id, userId: input.userId, caption: input.caption });
  } catch (error) {
    logServerError("db.createPostRecord", error, { userId: input.userId });
    throw new DatabaseError();
  }
}

/** Rolls back a partially created post when metadata inserts fail. */
export async function deletePostRecordById(
  postId: string,
  userId: string,
): Promise<void> {
  if (!parseUserId(postId) || !parseUserId(userId)) {
    throw new ValidationError("Invalid post identity.");
  }

  try {
    await getDb()
      .delete(posts)
      .where(and(eq(posts.id, postId), eq(posts.userId, userId)));
  } catch (error) {
    logServerError("db.deletePostRecordById", error, { postId, userId });
    throw new DatabaseError();
  }
}

export async function insertPostMedia(items: NewPostMedia[]): Promise<void> {
  if (items.length === 0) return;

  try {
    await getDb().insert(postMedia).values(items);
  } catch (error) {
    logServerError("db.insertPostMedia", error, { count: items.length });
    throw new DatabaseError();
  }
}

export async function insertPostHashtags(
  postId: string,
  tags: string[],
): Promise<void> {
  if (tags.length === 0) return;
  if (!parseUserId(postId)) throw new ValidationError("Invalid post identity.");

  try {
    await getDb()
      .insert(postHashtags)
      .values(
        tags.map((tag, position) => ({
          postId,
          tag: tag.toLowerCase(),
          position,
        })),
      )
      .onConflictDoNothing();
  } catch (error) {
    logServerError("db.insertPostHashtags", error, { postId });
    throw new DatabaseError();
  }
}

async function loadMediaForPosts(postIds: string[]): Promise<Map<string, PublicPostMedia[]>> {
  const map = new Map<string, PublicPostMedia[]>();
  if (postIds.length === 0) return map;

  const rows = await getDb()
    .select({
      id: postMedia.id,
      postId: postMedia.postId,
      publicUrl: postMedia.publicUrl,
      mimeType: postMedia.mimeType,
      byteSize: postMedia.byteSize,
      width: postMedia.width,
      height: postMedia.height,
      altText: postMedia.altText,
      position: postMedia.position,
    })
    .from(postMedia)
    .where(inArray(postMedia.postId, postIds))
    .orderBy(asc(postMedia.postId), asc(postMedia.position));

  for (const row of rows) {
    const list = map.get(row.postId) ?? [];
    list.push({
      id: row.id,
      publicUrl: row.publicUrl,
      mimeType: row.mimeType,
      byteSize: row.byteSize,
      width: row.width,
      height: row.height,
      altText: row.altText,
      position: row.position,
    });
    map.set(row.postId, list);
  }
  return map;
}

async function loadHashtagsForPosts(postIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (postIds.length === 0) return map;

  const rows = await getDb()
    .select({
      postId: postHashtags.postId,
      tag: postHashtags.tag,
    })
    .from(postHashtags)
    .where(inArray(postHashtags.postId, postIds))
    .orderBy(asc(postHashtags.postId), asc(postHashtags.position));

  for (const row of rows) {
    const list = map.get(row.postId) ?? [];
    list.push(row.tag);
    map.set(row.postId, list);
  }
  return map;
}

/** Bounded newest-comment previews, batched for a whole feed page. */
async function loadCommentPreviews(
  postIds: string[],
  viewerUserId: string | null,
): Promise<Map<string, CommentPreview[]>> {
  const map = new Map<string, CommentPreview[]>();
  if (postIds.length === 0) return map;

  const rows = await getDb()
    .select({
      postId: comments.postId,
      userId: comments.userId,
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      username: users.username,
      displayName: profiles.displayName,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.userId))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(inArray(comments.postId, postIds))
    .orderBy(asc(comments.postId), desc(comments.createdAt), desc(comments.id));

  const visible = await filterCommentsForViewer(
    rows.map((row) => ({
      postId: row.postId,
      userId: row.userId,
      content: row.content,
      preview: {
        id: row.id,
        username: row.username,
        displayName: row.displayName ?? row.username,
        content: row.content,
        createdAt: toIso(row.createdAt),
      },
    })),
    viewerUserId,
  );

  for (const row of visible) {
    const list = map.get(row.postId) ?? [];
    if (list.length >= 2) continue;
    list.push(row.preview);
    map.set(row.postId, list);
  }
  return map;
}

interface PostWithAuthorRow extends RawRow {
  post_id: string;
  caption: string;
  cursor: string;
  updated_at: Date | string;
  author_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  like_count: number | string;
  comment_count: number | string;
  liked_by_viewer: boolean;
}

function toPublicPost(
  row: PostWithAuthorRow,
  media: PublicPostMedia[],
  hashtags: string[],
  previews: CommentPreview[] = [],
  hideLikeCount = false,
): PublicPost {
  return {
    id: row.post_id,
    author: {
      userId: row.author_id,
      username: row.username,
      displayName: row.display_name ?? row.username,
      avatarUrl: row.avatar_url,
    },
    caption: row.caption,
    hashtags,
    createdAt: toIso(row.cursor),
    updatedAt: toIso(row.updated_at),
    media: media.slice().sort((a, b) => a.position - b.position),
    likeCount: hideLikeCount ? 0 : numeric(row.like_count),
    likedByViewer: row.liked_by_viewer === true,
    commentCount: numeric(row.comment_count),
    commentPreviews: previews,
  };
}

/** Counts and viewer like state stay in the database projection, never client state. */
function postAuthorColumns(viewerUserId: string | null): SQL {
  return sql`
    "posts"."id" AS post_id,
    "posts"."caption" AS caption,
    ${postCursorTimestamp} AS cursor,
    "posts"."updated_at" AS updated_at,
    u."id" AS author_id,
    u."username" AS username,
    p."display_name" AS display_name,
    p."avatar_url" AS avatar_url,
    (SELECT count(*)::int FROM "post_likes" pl WHERE pl."post_id" = "posts"."id") AS like_count,
    (SELECT count(*)::int FROM "comments" c WHERE c."post_id" = "posts"."id") AS comment_count,
    ${
      viewerUserId
        ? sql`exists (
            SELECT 1 FROM "post_likes" vl
            WHERE vl."post_id" = "posts"."id" AND vl."user_id" = ${viewerUserId}
          )`
        : sql`false`
    } AS liked_by_viewer
  `;
}

const POST_AUTHOR_JOIN = sql`
  FROM "posts"
  INNER JOIN "users" u ON u."id" = "posts"."user_id"
  LEFT JOIN "profiles" p ON p."user_id" = u."id"
`;

async function loadPostPage(
  condition: SQL,
  limit: number,
  viewerUserId: string | null,
): Promise<PublicPostPage> {
  const result = await getDb().execute<PostWithAuthorRow>(sql`
    SELECT ${postAuthorColumns(viewerUserId)}
    ${POST_AUTHOR_JOIN}
    WHERE ${condition}
    ORDER BY ${buildPostPageOrder()}
    LIMIT ${limit + 1}
  `);

  const rows = extractRows<PostWithAuthorRow>(result);
  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const ids = pageRows.map((row) => row.post_id);
  const [media, hashtags, previews, hiddenLikes] = await Promise.all([
    loadMediaForPosts(ids),
    loadHashtagsForPosts(ids),
    loadCommentPreviews(ids, viewerUserId),
    loadHiddenLikeAuthors(pageRows.map((row) => row.author_id)),
  ]);

  const items = pageRows.map((row) =>
    toPublicPost(
      row,
      media.get(row.post_id) ?? [],
      hashtags.get(row.post_id) ?? [],
      previews.get(row.post_id) ?? [],
      row.author_id !== viewerUserId && hiddenLikes.has(row.author_id),
    ),
  );
  const lastRow = pageRows.at(-1);

  return {
    items,
    nextCursor:
      hasMore && lastRow
        ? encodePageCursor({ createdAt: text(lastRow.cursor), id: text(lastRow.post_id) })
        : null,
  };
}

/** One post with author, media, hashtags, engagement, and comment previews. */
export async function getPublicPostById(
  postId: string,
  viewerUserId: string | null = null,
): Promise<PublicPost | null> {
  if (!parseUserId(postId)) return null;

  try {
    const result = await getDb().execute<PostWithAuthorRow>(sql`
      SELECT ${postAuthorColumns(viewerUserId)}
      ${POST_AUTHOR_JOIN}
      WHERE "posts"."id" = ${postId}
        AND ${buildPostVisibilityCondition(viewerUserId)}
      LIMIT 1
    `);
    const row = extractRows<PostWithAuthorRow>(result)[0];
    if (!row) return null;

    const [media, hashtags, previews, hiddenLikes] = await Promise.all([
      loadMediaForPosts([postId]),
      loadHashtagsForPosts([postId]),
      loadCommentPreviews([postId], viewerUserId),
      loadHiddenLikeAuthors([row.author_id]),
    ]);

    return toPublicPost(
      row,
      media.get(postId) ?? [],
      hashtags.get(postId) ?? [],
      previews.get(postId) ?? [],
      row.author_id !== viewerUserId && hiddenLikes.has(row.author_id),
    );
  } catch (error) {
    logServerError("db.getPublicPostById", error, { postId });
    throw new DatabaseError();
  }
}

/** Public recent-post feed used for anonymous visitors. */
export async function listRecentPosts(
  options: {
    limit?: number;
    cursor?: string | null;
    tag?: string | null;
    viewerUserId?: string | null;
  } = {},
): Promise<PublicPostPage> {
  const limit = safeLimit(options.limit, 12);
  const cursor = decodePageCursor(options.cursor);
  const tag = options.tag?.toLowerCase() || null;
  const viewerUserId = options.viewerUserId ?? null;

  try {
    return await loadPostPage(
      and(
        buildPostPageCondition(sql`true`, cursor, tag),
        buildPostVisibilityCondition(viewerUserId),
      )!,
      limit,
      viewerUserId,
    );
  } catch (error) {
    logServerError("db.listRecentPosts", error, { tagLength: tag?.length ?? 0 });
    throw new DatabaseError();
  }
}

/** Authenticated feed: own posts and posts from followed users, newest first. */
export async function listFeedPosts(
  options: {
    viewerUserId: string;
    limit?: number;
    cursor?: string | null;
    tag?: string | null;
  },
): Promise<PublicPostPage> {
  if (!parseUserId(options.viewerUserId)) {
    throw new ValidationError("Invalid account identity.");
  }

  const limit = safeLimit(options.limit, 12);
  const cursor = decodePageCursor(options.cursor);
  const tag = options.tag?.toLowerCase() || null;

  try {
    return await loadPostPage(
      and(
        buildSocialFeedCondition(options.viewerUserId, cursor, tag),
        buildPostVisibilityCondition(options.viewerUserId),
      )!,
      limit,
      options.viewerUserId,
    );
  } catch (error) {
    logServerError("db.listFeedPosts", error, { tagLength: tag?.length ?? 0 });
    throw new DatabaseError();
  }
}

/** Owner-scoped lookup used for edits and storage cleanup. */
export async function getOwnedPostForMutation(
  postId: string,
  userId: string,
): Promise<{ id: string; storagePaths: string[] } | null> {
  if (!parseUserId(postId) || !parseUserId(userId)) {
    throw new ValidationError("Invalid post identity.");
  }

  try {
    const result = await getDb().execute<RawRow>(sql`
      SELECT "posts"."id" AS post_id, pm."storage_path" AS storage_path
      FROM "posts"
      LEFT JOIN "post_media" pm ON pm."post_id" = "posts"."id"
      WHERE "posts"."id" = ${postId} AND "posts"."user_id" = ${userId}
      ORDER BY pm."position" ASC
    `);
    const rows = extractRows<RawRow>(result);
    if (rows.length === 0) return null;

    return {
      id: text(rows[0]!.post_id),
      storagePaths: rows
        .map((row) => nullableText(row.storage_path))
        .filter((path): path is string => Boolean(path)),
    };
  } catch (error) {
    logServerError("db.getOwnedPostForMutation", error, { postId, userId });
    throw new DatabaseError();
  }
}

/** Owner-scoped caption update; non-owners receive no indication the post exists. */
export async function updateOwnPost(
  postId: string,
  userId: string,
  caption: string,
): Promise<PublicPost | null> {
  if (!parseUserId(postId) || !parseUserId(userId)) {
    throw new ValidationError("Invalid post identity.");
  }

  try {
    const rows = await getDb()
      .update(posts)
      .set({ caption, updatedAt: new Date() })
      .where(and(eq(posts.id, postId), eq(posts.userId, userId)))
      .returning({ id: posts.id });
    if (rows.length === 0) return null;

    await getDb()
      .delete(postHashtags)
      .where(eq(postHashtags.postId, postId));
    await insertPostHashtags(postId, extractHashtags(caption));
    return getPublicPostById(postId, userId);
  } catch (error) {
    logServerError("db.updateOwnPost", error, { postId, userId });
    throw new DatabaseError();
  }
}

/** Deletes only the authenticated owner's post; media rows cascade. */
export async function deleteOwnPost(
  postId: string,
  userId: string,
): Promise<{ id: string; storagePaths: string[] } | null> {
  const owned = await getOwnedPostForMutation(postId, userId);
  if (!owned) return null;

  try {
    const rows = await getDb()
      .delete(posts)
      .where(and(eq(posts.id, postId), eq(posts.userId, userId)))
      .returning({ id: posts.id });
    if (rows.length === 0) return null;
    return owned;
  } catch (error) {
    logServerError("db.deleteOwnPost", error, { postId, userId });
    throw new DatabaseError();
  }
}
