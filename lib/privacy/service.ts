import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  closeFriends,
  conversationRequests,
  follows,
  profilePrivacySettings,
  profiles,
  storyAudienceEntries,
  userRelationships,
  users,
  type ProfilePrivacySettings,
} from "@/lib/db/schema";
import { parseUserId } from "@/lib/db/profile-sql";
import type { PrivacySettingsValues } from "@/lib/validations/privacy";

export const DEFAULT_PRIVACY: PrivacySettingsValues = {
  isPrivate: false,
  whoCanMessage: "everyone",
  messageRequestsEnabled: true,
  readReceipts: true,
  activityStatus: true,
  conversationPrivacy: "participants",
  whoCanComment: "everyone",
  commentsEnabled: true,
  mentionPermission: "everyone",
  tagApproval: false,
  discoverable: true,
  contactVisibility: "followers",
  profileInfoVisibility: "everyone",
  hideLikeCounts: false,
  hideViewCounts: false,
  hiddenWords: [],
  storyAudience: "followers",
  storyReplies: "everyone",
  storyInteractions: "everyone",
};

function mapSettings(
  row: ProfilePrivacySettings | null | undefined,
  isPrivate = false,
): PrivacySettingsValues {
  if (!row) return { ...DEFAULT_PRIVACY, isPrivate };
  return {
    isPrivate,
    whoCanMessage: row.whoCanMessage as PrivacySettingsValues["whoCanMessage"],
    messageRequestsEnabled: row.messageRequestsEnabled,
    readReceipts: row.readReceipts,
    activityStatus: row.activityStatus,
    conversationPrivacy: row.conversationPrivacy as PrivacySettingsValues["conversationPrivacy"],
    whoCanComment: row.whoCanComment as PrivacySettingsValues["whoCanComment"],
    commentsEnabled: row.commentsEnabled,
    mentionPermission: row.mentionPermission as PrivacySettingsValues["mentionPermission"],
    tagApproval: row.tagApproval,
    discoverable: row.discoverable,
    contactVisibility: row.contactVisibility as PrivacySettingsValues["contactVisibility"],
    profileInfoVisibility: row.profileInfoVisibility as PrivacySettingsValues["profileInfoVisibility"],
    hideLikeCounts: row.hideLikeCounts,
    hideViewCounts: row.hideViewCounts,
    hiddenWords: row.hiddenWords ?? [],
    storyAudience: row.storyAudience as PrivacySettingsValues["storyAudience"],
    storyReplies: row.storyReplies as PrivacySettingsValues["storyReplies"],
    storyInteractions: row.storyInteractions as PrivacySettingsValues["storyInteractions"],
  };
}

/** Missing rows are the documented neutral defaults; no write-on-read. */
export async function getPrivacySettings(userId: string): Promise<PrivacySettingsValues> {
  if (!parseUserId(userId)) return { ...DEFAULT_PRIVACY };
  const rows = await getDb()
    .select({ settings: profilePrivacySettings, isPrivate: profiles.isPrivate })
    .from(profiles)
    .leftJoin(profilePrivacySettings, eq(profilePrivacySettings.userId, profiles.userId))
    .where(eq(profiles.userId, userId))
    .limit(1);
  return mapSettings(rows[0]?.settings, rows[0]?.isPrivate ?? false);
}

/** Owner-only upsert called from a validated server action with session identity. */
export async function updateOwnPrivacySettings(
  userId: string,
  values: PrivacySettingsValues,
): Promise<void> {
  if (!parseUserId(userId)) throw new Error("Invalid account identity.");
  const { isPrivate, ...settings } = values;
  await getDb()
    .insert(profilePrivacySettings)
    .values({ userId, ...settings, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: profilePrivacySettings.userId,
      set: { ...settings, updatedAt: new Date() },
    });

  await getDb()
    .update(profiles)
    .set({ isPrivate, updatedAt: new Date() })
    .where(eq(profiles.userId, userId));
}

export interface PrivacyContext {
  viewerId: string | null;
  targetId: string;
  targetStatus: "active" | "warning" | "restricted" | "suspended" | "banned" | null;
  settings: PrivacySettingsValues;
  blockedByViewer: boolean;
  blockedViewer: boolean;
  restrictedByViewer: boolean;
  restrictedViewer: boolean;
  mutedByViewer: boolean;
  viewerFollowsTarget: boolean;
  targetFollowsViewer: boolean;
  isCloseFriend: boolean;
  conversationRequestPending: boolean;
}

const emptyContext = (viewerId: string | null, targetId: string): PrivacyContext => ({
  viewerId,
  targetId,
  targetStatus: null,
  settings: { ...DEFAULT_PRIVACY },
  blockedByViewer: false,
  blockedViewer: false,
  restrictedByViewer: false,
  restrictedViewer: false,
  mutedByViewer: false,
  viewerFollowsTarget: false,
  targetFollowsViewer: false,
  isCloseFriend: false,
  conversationRequestPending: false,
});

/**
 * One bounded batch of indexed lookups supplies every privacy decision. Callers
 * must pass session-derived IDs; this function never trusts a request body.
 */
export async function getPrivacyContext(
  viewerId: string | null,
  targetId: string,
): Promise<PrivacyContext> {
  if (!parseUserId(targetId)) return emptyContext(viewerId, targetId);
  if (!viewerId || !parseUserId(viewerId) || viewerId === targetId) {
    const base = emptyContext(viewerId, targetId);
    const rows = await getDb()
      .select({
        status: users.accountStatus,
        settings: profilePrivacySettings,
        isPrivate: profiles.isPrivate,
      })
      .from(users)
      .leftJoin(profilePrivacySettings, eq(profilePrivacySettings.userId, users.id))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.id, targetId))
      .limit(1);
    return {
      ...base,
      targetStatus: (rows[0]?.status as PrivacyContext["targetStatus"]) ?? null,
      settings: mapSettings(rows[0]?.settings, rows[0]?.isPrivate ?? false),
    };
  }

  const [targetRows, relationshipRows, followRows, friendRows, requestRows] =
    await Promise.all([
      getDb()
        .select({
          status: users.accountStatus,
          settings: profilePrivacySettings,
          isPrivate: profiles.isPrivate,
        })
        .from(users)
        .leftJoin(profilePrivacySettings, eq(profilePrivacySettings.userId, users.id))
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(eq(users.id, targetId))
        .limit(1),
      getDb()
        .select({
          actorId: userRelationships.actorId,
          kind: userRelationships.kind,
        })
        .from(userRelationships)
        .where(
          and(
            inArray(userRelationships.targetId, [viewerId, targetId]),
            inArray(userRelationships.actorId, [viewerId, targetId]),
          ),
        ),
      getDb()
        .select({ followerId: follows.followerId, followingId: follows.followingId })
        .from(follows)
        .where(
          and(
            inArray(follows.followerId, [viewerId, targetId]),
            inArray(follows.followingId, [viewerId, targetId]),
          ),
        ),
      getDb()
        .select({ id: closeFriends.id })
        .from(closeFriends)
        .where(
          and(
            eq(closeFriends.ownerId, targetId),
            eq(closeFriends.memberId, viewerId),
          ),
        )
        .limit(1),
      getDb()
        .select({ id: conversationRequests.id })
        .from(conversationRequests)
        .where(
          and(
            eq(conversationRequests.senderId, viewerId),
            eq(conversationRequests.recipientId, targetId),
            eq(conversationRequests.status, "pending"),
          ),
        )
        .limit(1),
    ]);

  const byPair = new Set(
    relationshipRows.map((row) => `${row.actorId}:${row.kind}`),
  );
  const viewerFollowsTarget = followRows.some(
    (row) => row.followerId === viewerId && row.followingId === targetId,
  );
  const targetFollowsViewer = followRows.some(
    (row) => row.followerId === targetId && row.followingId === viewerId,
  );

  return {
    viewerId,
    targetId,
    targetStatus: (targetRows[0]?.status as PrivacyContext["targetStatus"]) ?? null,
    settings: mapSettings(targetRows[0]?.settings, targetRows[0]?.isPrivate ?? false),
    blockedByViewer: byPair.has(`${viewerId}:block`),
    blockedViewer: byPair.has(`${targetId}:block`),
    restrictedByViewer: byPair.has(`${viewerId}:restrict`),
    restrictedViewer: byPair.has(`${targetId}:restrict`),
    mutedByViewer: byPair.has(`${viewerId}:mute`),
    viewerFollowsTarget,
    targetFollowsViewer,
    isCloseFriend: friendRows.length > 0,
    conversationRequestPending: requestRows.length > 0,
  };
}

function isMutuallyBlocked(context: PrivacyContext): boolean {
  return context.blockedByViewer || context.blockedViewer;
}

function isOwner(context: PrivacyContext): boolean {
  return context.viewerId === context.targetId;
}

export function canViewAccount(context: PrivacyContext): boolean {
  if (!context.viewerId) return context.targetStatus !== "banned";
  if (isOwner(context)) return true;
  return context.targetStatus !== "banned" && !isMutuallyBlocked(context);
}

/** Private accounts show a profile shell but conceal posts and media. */
export function canViewPosts(context: PrivacyContext): boolean {
  if (isOwner(context)) return true;
  if (!canViewAccount(context)) return false;
  return !context.settings.isPrivate || context.viewerFollowsTarget;
}

export function canComment(context: PrivacyContext): boolean {
  if (!canViewPosts(context)) return false;
  if (isOwner(context)) return true;
  if (!context.settings.commentsEnabled) return false;
  if (context.restrictedViewer || context.restrictedByViewer) return false;
  switch (context.settings.whoCanComment) {
    case "followers":
      return context.viewerFollowsTarget;
    case "followed":
      return context.targetFollowsViewer;
    case "nobody":
      return false;
    default:
      return true;
  }
}

export function canMessage(context: PrivacyContext): boolean {
  if (isOwner(context)) return false;
  if (!canViewAccount(context)) return false;
  if (context.restrictedViewer) return false;
  switch (context.settings.whoCanMessage) {
    case "followers":
      return context.viewerFollowsTarget;
    case "nobody":
      return false;
    default:
      return true;
  }
}

export function requiresMessageRequest(context: PrivacyContext): boolean {
  return (
    canMessage(context) &&
    context.settings.messageRequestsEnabled &&
    !context.viewerFollowsTarget
  );
}

export async function canViewStory(
  viewerId: string | null,
  storyId: string,
  ownerId: string,
): Promise<boolean> {
  if (viewerId === ownerId) return true;
  const context = await getPrivacyContext(viewerId, ownerId);
  if (!canViewAccount(context) || !viewerId) return false;

  const entries = await getDb()
    .select({ userId: storyAudienceEntries.userId, kind: storyAudienceEntries.kind })
    .from(storyAudienceEntries)
    .where(eq(storyAudienceEntries.storyId, storyId));

  if (entries.some((entry) => entry.userId === viewerId && entry.kind === "exclude")) {
    return false;
  }

  switch (context.settings.storyAudience) {
    case "close_friends":
      return context.isCloseFriend;
    case "custom":
      return entries.some(
        (entry) => entry.userId === viewerId && entry.kind === "include",
      );
    default:
      return context.viewerFollowsTarget;
  }
}

export function canReplyToStory(context: PrivacyContext): boolean {
  if (isOwner(context)) return false;
  if (!canViewAccount(context)) return false;
  if (context.settings.storyReplies === "nobody") return false;
  if (context.settings.storyReplies === "followers") return context.viewerFollowsTarget;
  return true;
}

export function canReactToStory(context: PrivacyContext): boolean {
  if (isOwner(context)) return false;
  if (!canViewAccount(context)) return false;
  if (context.settings.storyInteractions === "nobody") return false;
  if (context.settings.storyInteractions === "followers") return context.viewerFollowsTarget;
  return true;
}

/** Hidden words are viewer-side filters and never alter stored content. */
export function containsHiddenWord(content: string, hiddenWords: string[]): boolean {
  const normalized = content.toLocaleLowerCase();
  return hiddenWords.some((word) => {
    const phrase = word.trim().toLocaleLowerCase();
    return phrase.length > 0 && normalized.includes(phrase);
  });
}

export async function filterHiddenWords<T extends { content: string }>(
  viewerId: string | null,
  items: T[],
): Promise<T[]> {
  if (!viewerId || items.length === 0) return items;
  const settings = await getPrivacySettings(viewerId);
  if (settings.hiddenWords.length === 0) return items;
  return items.filter((item) => !containsHiddenWord(item.content, settings.hiddenWords));
}
