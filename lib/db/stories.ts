import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  profiles,
  stories,
  storyAudienceEntries,
  storyViews,
  users,
  type NewStory,
} from "@/lib/db/schema";
import {
  MAX_STORIES_PER_GROUP,
  MAX_TRAY_STORIES,
  MAX_VIEWER_LIST,
  STORY_REACTIONS,
  nextStoryExpiration,
  type StoryReactionEmoji,
} from "@/lib/stories/constants";
import {
  buildOwnedStoryCondition,
  buildStoryVisibilityCondition,
} from "@/lib/db/story-query";
import {
  buildRecordStoryViewStatement,
  buildRemoveStoryReactionStatement,
  buildSetStoryReactionStatement,
} from "@/lib/db/story-sql";
import { parseUserId } from "@/lib/db/profile-sql";
import { canReactToStory, getPrivacyContext } from "@/lib/privacy/service";
import { DatabaseError, ValidationError } from "@/lib/errors";
import { logServerError } from "@/lib/logging";

import type {
  StoryGroup,
  StoryItem,
  StoryViewerEntry,
} from "@/lib/stories/types";

export type { StoryGroup, StoryItem, StoryViewerEntry } from "@/lib/stories/types";

/** Safe DTOs for the tray and the full-screen viewer. */

interface RawStoryRow {
  [key: string]: unknown;
  story_id?: unknown;
  user_id?: unknown;
  username?: unknown;
  display_name?: unknown;
  avatar_url?: unknown;
  media_url?: unknown;
  byte_size?: unknown;
  caption?: unknown;
  text_overlay?: unknown;
  created_at?: unknown;
  expires_at?: unknown;
  seen?: unknown;
}

interface RawReactionRow {
  [key: string]: unknown;
  story_id?: unknown;
  emoji?: unknown;
  count?: unknown;
  viewer_has?: unknown;
}

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    return Array.isArray(rows) ? (rows as T[]) : [];
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
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date(0).toISOString();
}

function validateIds(...values: string[]): void {
  for (const value of values) {
    if (!parseUserId(value)) throw new ValidationError("Invalid story identity.");
  }
}

function isStoryReactionEmoji(value: string): value is StoryReactionEmoji {
  return (STORY_REACTIONS as readonly string[]).includes(value);
}

/** One aggregate query for all visible stories; no per-story reaction queries. */
async function loadInteractions(
  storyIds: string[],
  viewerUserId: string,
): Promise<Map<string, { counts: Record<string, number>; reaction: StoryReactionEmoji | null }>> {
  const result = new Map<
    string,
    { counts: Record<string, number>; reaction: StoryReactionEmoji | null }
  >();
  if (storyIds.length === 0) return result;

  const idList = sql.join(
    storyIds.map((id) => sql`${id}`),
    sql`, `,
  );

  try {
    const rows = await getDb().execute<RawReactionRow>(sql`
      SELECT
        story_id,
        emoji,
        count(*)::int AS count,
        max(CASE WHEN user_id = ${viewerUserId} THEN 1 ELSE 0 END) AS viewer_has
      FROM story_reactions
      WHERE story_id IN (${idList})
      GROUP BY story_id, emoji
    `);

    for (const row of extractRows<RawReactionRow>(rows)) {
      const storyId = text(row.story_id);
      const emoji = text(row.emoji);
      if (!storyId || !isStoryReactionEmoji(emoji)) continue;

      let entry = result.get(storyId);
      if (!entry) {
        entry = { counts: {}, reaction: null };
        result.set(storyId, entry);
      }
      entry.counts[emoji] = numeric(row.count);
      if (Number(row.viewer_has) === 1) entry.reaction = emoji;
    }
  } catch (error) {
    logServerError("db.loadStoryInteractions", error, { count: storyIds.length });
    throw new DatabaseError();
  }

  return result;
}

function toStoryItem(
  row: RawStoryRow,
  interactions: Awaited<ReturnType<typeof loadInteractions>>,
): StoryItem {
  const id = text(row.story_id);
  const entry = interactions.get(id);
  return {
    id,
    mediaUrl: text(row.media_url),
    mediaType: "image",
    byteSize: numeric(row.byte_size),
    caption: text(row.caption),
    textOverlay: nullableText(row.text_overlay),
    createdAt: toIso(row.created_at),
    expiresAt: toIso(row.expires_at),
    reactionCounts: entry?.counts ?? {},
    viewerReaction: entry?.reaction ?? null,
  };
}

interface ListStoryGroupsOptions {
  viewerUserId: string;
  targetUserId?: string | null;
  includeInteractions?: boolean;
}

/**
 * One bounded, joined query builds the tray or a single author's viewer. Own
 * stories come first, then groups with unseen stories, then seen groups.
 */
export async function listStoryGroups({
  viewerUserId,
  targetUserId,
  includeInteractions = false,
}: ListStoryGroupsOptions): Promise<StoryGroup[]> {
  validateIds(viewerUserId);
  if (targetUserId) validateIds(targetUserId);

  const nowIso = new Date().toISOString();
  const condition = buildStoryVisibilityCondition(viewerUserId, nowIso, targetUserId);

  try {
    const result = await getDb().execute<RawStoryRow>(sql`
      WITH eligible AS (
        SELECT
          s.id AS story_id,
          s.user_id AS user_id,
          s.media_url AS media_url,
          s.byte_size AS byte_size,
          s.caption AS caption,
          s.text_overlay AS text_overlay,
          s.created_at AS created_at,
          s.expires_at AS expires_at,
          u.username AS username,
          p.display_name AS display_name,
          p.avatar_url AS avatar_url,
          (v.id IS NOT NULL) AS seen,
          row_number() OVER (
            PARTITION BY s.user_id ORDER BY s.created_at DESC, s.id DESC
          ) AS story_rank
        FROM stories s
        INNER JOIN users u ON u.id = s.user_id
        LEFT JOIN profiles p ON p.user_id = u.id
        LEFT JOIN story_views v
          ON v.story_id = s.id AND v.viewer_id = ${viewerUserId}
        WHERE ${condition}
      )
      SELECT * FROM eligible
      WHERE story_rank <= ${MAX_STORIES_PER_GROUP}
      ORDER BY
        (user_id = ${viewerUserId}) DESC,
        seen ASC,
        lower(username) ASC,
        story_rank ASC
      LIMIT ${MAX_TRAY_STORIES}
    `);

    const rows = extractRows<RawStoryRow>(result);
    const interactions = includeInteractions
      ? await loadInteractions(
          rows.map((row) => text(row.story_id)),
          viewerUserId,
        )
      : new Map<string, never>();

    const groups: StoryGroup[] = [];
    const byUser = new Map<string, StoryGroup>();

    for (const row of rows) {
      const userId = text(row.user_id);
      if (!userId) continue;

      let group = byUser.get(userId);
      if (!group) {
        group = {
          userId,
          username: text(row.username),
          displayName: text(row.display_name) || text(row.username),
          avatarUrl: nullableText(row.avatar_url),
          isOwn: userId === viewerUserId,
          unseen: false,
          stories: [],
        };
        byUser.set(userId, group);
        groups.push(group);
      }

      if (!Boolean(row.seen)) group.unseen = true;
      group.stories.push(toStoryItem(row, interactions));
    }

    return groups;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logServerError("db.listStoryGroups", error, { targetUserId });
    throw new DatabaseError();
  }
}

/** Creates an owned story with a server-generated 24-hour expiry. */
export async function createStoryRecord(input: {
  id: string;
  userId: string;
  storagePath: string;
  mediaUrl: string;
  mimeType: string;
  byteSize: number;
  caption: string;
  textOverlay: string | null;
  audience?: string | null;
  userIds?: string[] | null;
  excludedUserIds?: string[] | null;
}): Promise<{ id: string; expiresAt: string }> {
  validateIds(input.id, input.userId);

  const audience = ["followers", "close_friends", "custom"].includes(input.audience ?? "")
    ? input.audience!
    : "followers";
  const cleanIds = (values: string[] | null | undefined): string[] =>
    [...new Set((values ?? []).filter((id) => parseUserId(id) && id !== input.userId))].slice(0, 200);
  const included = audience === "custom" ? cleanIds(input.userIds) : [];
  const excluded = cleanIds(input.excludedUserIds).filter((id) => !included.includes(id));

  const values: NewStory = {
    id: input.id,
    userId: input.userId,
    storagePath: input.storagePath,
    mediaUrl: input.mediaUrl,
    mediaType: input.mimeType,
    byteSize: input.byteSize,
    caption: input.caption,
    textOverlay: input.textOverlay,
    audience,
    expiresAt: nextStoryExpiration(),
  };

  try {
    const rows = await getDb()
      .insert(stories)
      .values(values)
      .returning({ id: stories.id, expiresAt: stories.expiresAt });
    const row = rows[0];
    if (!row) throw new DatabaseError();

    const entries = [
      ...included.map((userId) => ({ storyId: row.id, userId, kind: "include" })),
      ...excluded.map((userId) => ({ storyId: row.id, userId, kind: "exclude" })),
    ];
    if (entries.length > 0) {
      await getDb().insert(storyAudienceEntries).values(entries).onConflictDoNothing();
    }
    return { id: row.id, expiresAt: row.expiresAt.toISOString() };
  } catch (error) {
    if (error instanceof DatabaseError || error instanceof ValidationError) throw error;
    logServerError("db.createStoryRecord", error, { userId: input.userId });
    throw new DatabaseError();
  }
}

/** Owner of a story the viewer may actually open, including audience rules. */
async function getVisibleStoryOwner(
  storyId: string,
  viewerId: string,
): Promise<string | null> {
  const rows = await getDb()
    .select({ ownerId: stories.userId })
    .from(stories)
    .where(
      and(
        eq(stories.id, storyId),
        buildStoryVisibilityCondition(viewerId, new Date().toISOString()),
      ),
    )
    .limit(1);
  return rows[0]?.ownerId ?? null;
}

/** Active, authorized story detail for views, reactions, and deletion UI. */
export async function getActiveStoryById(
  storyId: string,
  viewerUserId: string,
): Promise<StoryItem | null> {
  validateIds(storyId, viewerUserId);
  const nowIso = new Date().toISOString();

  try {
    const rows = await getDb()
      .select({
        story_id: stories.id,
        user_id: stories.userId,
        media_url: stories.mediaUrl,
        byte_size: stories.byteSize,
        caption: stories.caption,
        text_overlay: stories.textOverlay,
        created_at: stories.createdAt,
        expires_at: stories.expiresAt,
      })
      .from(stories)
      .where(
        and(eq(stories.id, storyId), buildStoryVisibilityCondition(viewerUserId, nowIso)),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    const interactions = await loadInteractions([storyId], viewerUserId);
    return toStoryItem(row, interactions);
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logServerError("db.getActiveStoryById", error, { storyId });
    throw new DatabaseError();
  }
}

/** Idempotent unique-viewer write; returns true only for a new view. */
export async function recordStoryView(
  storyId: string,
  viewerId: string,
): Promise<boolean> {
  validateIds(storyId, viewerId);
  const ownerId = await getVisibleStoryOwner(storyId, viewerId);
  if (!ownerId || ownerId === viewerId) return false;

  try {
    const result = await getDb().execute(
      buildRecordStoryViewStatement(storyId, viewerId, new Date().toISOString()),
    );
    return extractRows<{ id: string }>(result).length > 0;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logServerError("db.recordStoryView", error, { storyId });
    throw new DatabaseError();
  }
}

/** Returns null when the caller does not own the story. */
export async function getStoryViewerList(
  storyId: string,
  ownerId: string,
): Promise<StoryViewerEntry[] | null> {
  validateIds(storyId, ownerId);

  try {
    const owned = await getDb()
      .select({ id: stories.id })
      .from(stories)
      .where(buildOwnedStoryCondition(storyId, ownerId))
      .limit(1);
    if (owned.length === 0) return null;

    const rows = await getDb()
      .select({
        userId: users.id,
        username: users.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        viewedAt: storyViews.viewedAt,
      })
      .from(storyViews)
      .innerJoin(users, eq(users.id, storyViews.viewerId))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(storyViews.storyId, storyId))
      .orderBy(sql`${storyViews.viewedAt} desc, ${storyViews.id} desc`)
      .limit(MAX_VIEWER_LIST);

    return rows.map((row) => ({
      userId: row.userId,
      username: row.username,
      displayName: row.displayName ?? row.username,
      avatarUrl: row.avatarUrl,
      viewedAt: toIso(row.viewedAt),
    }));
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logServerError("db.getStoryViewerList", error, { storyId });
    throw new DatabaseError();
  }
}

/** `emoji: null` removes the caller's own reaction. */
export async function setStoryReaction(
  storyId: string,
  userId: string,
  emoji: StoryReactionEmoji | null,
): Promise<{ emoji: StoryReactionEmoji | null }> {
  validateIds(storyId, userId);
  const ownerId = await getVisibleStoryOwner(storyId, userId);
  if (!ownerId) throw new ValidationError("That story is no longer available.");
  const context = await getPrivacyContext(userId, ownerId);
  if (!canReactToStory(context)) throw new ValidationError("You cannot react to this story.");
  const nowIso = new Date().toISOString();

  try {
    if (emoji === null) {
      await getDb().execute(buildRemoveStoryReactionStatement(storyId, userId));
      return { emoji: null };
    }

    const result = await getDb().execute(
      buildSetStoryReactionStatement(storyId, userId, emoji, nowIso),
    );
    if (extractRows<{ id: string }>(result).length === 0) {
      throw new ValidationError("That story is no longer available.");
    }
    return { emoji };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logServerError("db.setStoryReaction", error, { storyId });
    throw new DatabaseError();
  }
}

/** Returns the owner-namespaced storage key only when ownership matched. */
export async function deleteOwnedStory(
  storyId: string,
  ownerId: string,
): Promise<string | null> {
  validateIds(storyId, ownerId);

  try {
    const rows = await getDb()
      .delete(stories)
      .where(buildOwnedStoryCondition(storyId, ownerId))
      .returning({ storagePath: stories.storagePath });
    return rows[0]?.storagePath ?? null;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logServerError("db.deleteOwnedStory", error, { storyId });
    throw new DatabaseError();
  }
}
