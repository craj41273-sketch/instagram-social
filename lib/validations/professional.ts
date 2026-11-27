import { z } from "zod";
import {
  LINK_TYPES,
  PROJECT_STATUSES,
} from "@/lib/privacy/constants";
import { safeUrlSchema } from "@/lib/validations/privacy";

const shortText = (max: number) =>
  z.string().trim().max(max, `Use ${max} characters or fewer.`);

export const profileLinkSchema = z.object({
  label: z.string().trim().min(1, "Add a link label.").max(80),
  url: safeUrlSchema,
  linkType: z.enum(LINK_TYPES),
  icon: shortText(60).optional().default(""),
  position: z.number().int().min(0).max(100),
  enabled: z.boolean().default(true),
  visibility: z.enum(["everyone", "followers"]).default("everyone"),
});

export const profileLinkInputSchema = profileLinkSchema.omit({ position: true });
export type ProfileLinkInput = z.infer<typeof profileLinkInputSchema>;

export const linkOrderSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(100),
});

export const portfolioProjectSchema = z.object({
  title: z.string().trim().min(1, "Add a project title.").max(120),
  description: shortText(2000).default(""),
  imageUrl: safeUrlSchema.optional().or(z.literal("")),
  technologies: z.array(shortText(80)).max(50).default([]),
  skills: z.array(shortText(80)).max(50).default([]),
  liveUrl: safeUrlSchema.optional().or(z.literal("")),
  repositoryUrl: safeUrlSchema.optional().or(z.literal("")),
  portfolioUrl: safeUrlSchema.optional().or(z.literal("")),
  status: z.enum(PROJECT_STATUSES).default("completed"),
  featured: z.boolean().default(false),
});

export type PortfolioProjectInput = z.infer<typeof portfolioProjectSchema>;
