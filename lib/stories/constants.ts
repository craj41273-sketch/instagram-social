/** Client-safe constants shared by story services and UI. */

export const STORY_TTL_MS = 24 * 60 * 60 * 1000;

/** Expiry is always derived on the server; clients never supply this value. */
export function nextStoryExpiration(now: Date = new Date()): Date {
  return new Date(now.getTime() + STORY_TTL_MS);
}

/** Image stories advance in a comfortable, readable interval. */
export const STORY_DISPLAY_MS = 6_000;

export const STORY_REACTIONS = ["❤️", "😂", "😮", "🔥", "👏"] as const;

export type StoryReactionEmoji = (typeof STORY_REACTIONS)[number];

export const STORY_CAPTION_MAX = 500;
export const STORY_OVERLAY_MAX = 120;

/** Hard caps keep the tray bounded even for accounts with many active stories. */
export const MAX_STORIES_PER_GROUP = 20;
export const MAX_TRAY_STORIES = 200;
export const MAX_VIEWER_LIST = 100;
