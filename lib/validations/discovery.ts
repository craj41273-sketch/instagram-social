import { z } from "zod";

/** Client-safe schemas for Block 8 search and discovery inputs. */

export const searchTabSchema = z.enum(["all", "people", "posts"]);
export type SearchTab = z.infer<typeof searchTabSchema>;

const searchTermSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Enter at least 2 characters.")
  .max(50, "Search must be 50 characters or fewer.")
  .regex(
    /^[\p{L}\p{N} ._'#-]+$/u,
    "Use letters, numbers, spaces, dots, underscores, #, apostrophes, or hyphens.",
  );

export const discoveryQuerySchema = z.object({
  q: searchTermSchema,
  limit: z.coerce.number().int().min(1).max(20).default(12),
  offset: z.coerce.number().int().min(0).max(1_000).default(0),
});

export type DiscoveryQuery = z.infer<typeof discoveryQuerySchema>;

export const searchRequestSchema = discoveryQuerySchema.extend({
  tab: searchTabSchema.default("all"),
});

export type SearchRequest = z.infer<typeof searchRequestSchema>;
