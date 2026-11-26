import type { StoryReactionEmoji } from "@/lib/stories/constants";

/** Safe DTOs shared by story services and client islands. */

export interface StoryItem {
  id: string;
  mediaUrl: string;
  mediaType: "image";
  byteSize: number;
  caption: string;
  textOverlay: string | null;
  createdAt: string;
  expiresAt: string;
  reactionCounts: Record<string, number>;
  viewerReaction: StoryReactionEmoji | null;
}

export interface StoryGroup {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isOwn: boolean;
  unseen: boolean;
  stories: StoryItem[];
}

export interface StoryViewerEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  viewedAt: string;
}
