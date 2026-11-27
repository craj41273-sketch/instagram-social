/** Serializable result shared by settings, professional, and trust actions. */
export interface ActionState {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Partial<Record<string, string>>;
  /** Only set by the hype action after the server confirms the toggle. */
  active?: boolean;
}

export function initialActionState(): ActionState {
  return { status: "idle" };
}

export type PrivacyScope =
  | "all"
  | "account"
  | "stories"
  | "messages"
  | "comments"
  | "mentions"
  | "hiddenWords"
  | "notifications";

type SettingKey =
  | "isPrivate"
  | "whoCanMessage"
  | "messageRequestsEnabled"
  | "readReceipts"
  | "activityStatus"
  | "conversationPrivacy"
  | "whoCanComment"
  | "commentsEnabled"
  | "mentionPermission"
  | "tagApproval"
  | "discoverable"
  | "contactVisibility"
  | "profileInfoVisibility"
  | "hideLikeCounts"
  | "hideViewCounts"
  | "hiddenWords"
  | "storyAudience"
  | "storyReplies"
  | "storyInteractions";

/** A form may only write the fields owned by its settings page. */
export const PRIVACY_SCOPE_FIELDS: Record<PrivacyScope, readonly SettingKey[]> = {
  all: [
    "isPrivate",
    "whoCanMessage",
    "messageRequestsEnabled",
    "readReceipts",
    "activityStatus",
    "conversationPrivacy",
    "whoCanComment",
    "commentsEnabled",
    "mentionPermission",
    "tagApproval",
    "discoverable",
    "contactVisibility",
    "profileInfoVisibility",
    "hideLikeCounts",
    "hideViewCounts",
    "hiddenWords",
    "storyAudience",
    "storyReplies",
    "storyInteractions",
  ],
  account: [
    "isPrivate",
    "discoverable",
    "contactVisibility",
    "profileInfoVisibility",
    "activityStatus",
    "hideLikeCounts",
    "hideViewCounts",
  ],
  stories: ["storyAudience", "storyReplies", "storyInteractions"],
  messages: [
    "whoCanMessage",
    "messageRequestsEnabled",
    "readReceipts",
    "conversationPrivacy",
  ],
  comments: ["whoCanComment", "commentsEnabled"],
  mentions: ["mentionPermission", "tagApproval"],
  hiddenWords: ["hiddenWords"],
  notifications: ["activityStatus", "messageRequestsEnabled", "readReceipts"],
};
