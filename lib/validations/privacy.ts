import { z } from "zod";
import { usernameSchema } from "@/lib/validations/auth";
import {
  ACCOUNT_CATEGORIES,
  FOLLOW_REQUEST_STATUSES,
  PROFESSIONAL_ROLES,
  RELATIONSHIP_KINDS,
  STORY_AUDIENCES,
} from "@/lib/privacy/constants";

/** Only absolute HTTP(S) URLs are ever persisted or rendered. */
export const safeUrlSchema = z
  .string()
  .trim()
  .max(500, "URL must be 500 characters or fewer.")
  .refine((value) => {
    if (!/^https?:\/\//i.test(value)) return false;
    try {
      const parsed = new URL(value);
      return (
        (parsed.protocol === "https:" || parsed.protocol === "http:") &&
        Boolean(parsed.hostname)
      );
    } catch {
      return false;
    }
  }, "Enter a full http:// or https:// URL.");

export const optionalSafeUrlSchema = safeUrlSchema.optional().or(z.literal(""));

const audienceSchema = z.enum(["everyone", "followers", "nobody"]);
const commentAudienceSchema = z.enum([
  "everyone",
  "followers",
  "followed",
  "nobody",
]);
const storyControlSchema = z.enum(["everyone", "followers", "nobody"]);
const idList = z.array(z.uuid()).max(200);

export const privacySettingsSchema = z.object({
  isPrivate: z.boolean(),
  whoCanMessage: audienceSchema,
  messageRequestsEnabled: z.boolean(),
  readReceipts: z.boolean(),
  activityStatus: z.boolean(),
  conversationPrivacy: z.enum(["participants", "followers"]),
  whoCanComment: commentAudienceSchema,
  commentsEnabled: z.boolean(),
  mentionPermission: z.enum(["everyone", "followed", "nobody"]),
  tagApproval: z.boolean(),
  discoverable: z.boolean(),
  contactVisibility: audienceSchema,
  profileInfoVisibility: z.enum(["everyone", "followers"]),
  hideLikeCounts: z.boolean(),
  hideViewCounts: z.boolean(),
  hiddenWords: z
    .array(z.string().trim().min(1).max(60))
    .max(100),
  storyAudience: z.enum(STORY_AUDIENCES),
  storyReplies: storyControlSchema,
  storyInteractions: storyControlSchema,
});

export type PrivacySettingsValues = z.infer<typeof privacySettingsSchema>;

export const accountCategorySchema = z.object({
  category: z.enum(ACCOUNT_CATEGORIES),
  roles: z.array(z.enum(PROFESSIONAL_ROLES)).max(4),
  headline: z.string().trim().max(120).default(""),
  details: z
    .record(
      z.string().max(60),
      z.union([z.string().max(500), z.array(z.string().max(120)).max(50)]),
    )
    .default({}),
});

export type AccountCategoryValues = z.infer<typeof accountCategorySchema>;

export const relationshipSchema = z.object({
  username: usernameSchema,
  kind: z.enum(RELATIONSHIP_KINDS),
});

export const followRequestActionSchema = z.object({
  username: usernameSchema,
  intent: z.enum(["request", "cancel", "accept", "decline", "remove_follower"]),
});

export const storyAudienceSchema = z.object({
  audience: z.enum(STORY_AUDIENCES),
  userIds: idList.default([]),
  excludedUserIds: idList.default([]),
});

export const storyAudienceValuesSchema = storyAudienceSchema;

export const followRequestStatusSchema = z.enum(FOLLOW_REQUEST_STATUSES);
