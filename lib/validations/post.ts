import { z } from "zod";
import {
  IMAGE_MIME_TYPES,
  IMAGE_LIMITS,
} from "@/lib/storage/image-validation";

/** Client-safe request schemas for the post/media system. */

export const postCaptionSchema = z
  .string()
  .trim()
  .max(2200, "Captions must be 2,200 characters or fewer.");

export const postMediaInputSchema = z.object({
  storagePath: z.string().min(1).max(512),
  publicUrl: z.url().refine(
    (value) => /^https:\/\//i.test(value),
    "Media URLs must use HTTPS.",
  ),
  mimeType: z.enum(IMAGE_MIME_TYPES),
  byteSize: z.number().int().positive().max(IMAGE_LIMITS.POST_MEDIA_BYTES),
  width: z.number().int().positive().max(20_000).nullable().optional(),
  height: z.number().int().positive().max(20_000).nullable().optional(),
  altText: z.string().trim().max(160).nullable().optional(),
  position: z.number().int().min(0).max(IMAGE_LIMITS.MAX_POST_MEDIA - 1),
});

export const createPostInputSchema = z.object({
  caption: postCaptionSchema,
  media: z
    .array(postMediaInputSchema)
    .min(1, "Add at least one image.")
    .max(IMAGE_LIMITS.MAX_POST_MEDIA, `Add at most ${IMAGE_LIMITS.MAX_POST_MEDIA} images.`),
});

export type CreatePostInput = z.infer<typeof createPostInputSchema>;

/**
 * Browser-supplied display hints are optional and bounded. The server still
 * revalidates every image's declared type, magic bytes, and actual byte count.
 */
export const postMediaMetaSchema = z.object({
  width: z.number().int().positive().max(20_000).nullable().optional(),
  height: z.number().int().positive().max(20_000).nullable().optional(),
  altText: z.string().trim().max(160).nullable().optional(),
});

export const postMediaMetaListSchema = z
  .array(postMediaMetaSchema)
  .max(IMAGE_LIMITS.MAX_POST_MEDIA);

export type PostMediaMeta = z.infer<typeof postMediaMetaSchema>;

export const editPostSchema = z.object({
  postId: z.uuid(),
  caption: postCaptionSchema,
});

export type EditPostValues = z.infer<typeof editPostSchema>;

export const deletePostSchema = z.object({
  postId: z.uuid(),
});

export const postFeedQuerySchema = z.object({
  cursor: z.string().max(512).optional(),
  limit: z.coerce.number().int().min(1).max(24).default(12),
  tag: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{1,30}$/)
    .optional(),
});
