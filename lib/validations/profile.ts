import { z } from "zod";
import { displayNameSchema, usernameSchema } from "@/lib/validations/auth";

/** Client-safe schemas for Block 5 profile, follow, and lookup inputs. */

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`);

export const profileBioSchema = optionalText(160, "Bio");
export const profileLocationSchema = optionalText(100, "Location");

/** Only absolute HTTP(S) links are accepted; empty input clears the field. */
export const profileWebsiteSchema = z
  .string()
  .trim()
  .max(200, "Website must be 200 characters or fewer.")
  .refine(
    (value) =>
      value.length === 0 ||
      (/^https?:\/\//i.test(value) && z.url().safeParse(value).success),
    "Enter a full http:// or https:// URL.",
  );

export const editProfileSchema = z.object({
  displayName: displayNameSchema,
  username: usernameSchema,
  bio: profileBioSchema,
  website: profileWebsiteSchema,
  location: profileLocationSchema,
});

export type EditProfileValues = z.infer<typeof editProfileSchema>;

/** Follow actions receive a username and intent, never a user ID. */
export const followActionSchema = z.object({
  username: usernameSchema,
  intent: z.enum(["follow", "unfollow"]),
});

export type FollowActionValues = z.infer<typeof followActionSchema>;

/** Foundation for server-side username lookup; bounded to avoid enumeration. */
export const userSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Enter at least 2 characters.")
    .max(30, "Search must be 30 characters or fewer.")
    .regex(/^[a-z0-9._]+$/, "Use letters, numbers, dots, or underscores only."),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  offset: z.coerce.number().int().min(0).max(1_000).default(0),
});

export type UserSearchQuery = z.infer<typeof userSearchQuerySchema>;
