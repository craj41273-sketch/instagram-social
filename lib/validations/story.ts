import { z } from "zod";
import { IMAGE_MIME_TYPES } from "@/lib/storage/image-validation";
import {
  STORY_CAPTION_MAX,
  STORY_OVERLAY_MAX,
  STORY_REACTIONS,
} from "@/lib/stories/constants";

/** Client-safe request schemas. Identity and expiry are never accepted here. */

export const storyCaptionSchema = z
  .string()
  .trim()
  .max(STORY_CAPTION_MAX, `Captions must be ${STORY_CAPTION_MAX} characters or fewer.`);

export const storyTextOverlaySchema = z
  .string()
  .trim()
  .max(STORY_OVERLAY_MAX, `Text overlay must be ${STORY_OVERLAY_MAX} characters or fewer.`);

export const storyIdSchema = z.uuid();

export const storyReactionSchema = z.object({
  storyId: z.uuid(),
  emoji: z.enum(STORY_REACTIONS).nullable(),
});

export type StoryReactionValues = z.infer<typeof storyReactionSchema>;

/**
 * Browser-supplied image dimensions are optional hints only. The server still
 * validates MIME type, magic bytes, and the real byte count before publishing.
 */
export const storyMediaMetaSchema = z.object({
  width: z.number().int().positive().max(20_000).nullable().optional(),
  height: z.number().int().positive().max(20_000).nullable().optional(),
});

export const storyCreateInputSchema = z.object({
  caption: storyCaptionSchema.default(""),
  textOverlay: storyTextOverlaySchema.optional().default(""),
  mediaMeta: storyMediaMetaSchema.default({}),
  mimeType: z.enum(IMAGE_MIME_TYPES),
});

export type StoryCreateInput = z.infer<typeof storyCreateInputSchema>;
