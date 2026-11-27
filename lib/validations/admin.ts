import { z } from "zod";

export const MODERATION_ACTIONS = [
  "warning",
  "restrict",
  "suspend",
  "ban",
  "restore",
  "remove_content",
  "dismiss_report",
  "resolve_report",
  "escalate_report",
] as const;

export const riskAssessmentSchema = z.object({
  userId: z.uuid(),
  score: z.number().int().min(0).max(100),
  reason: z.string().trim().min(1, "A reason is required.").max(1000),
  evidenceRefs: z.array(z.uuid()).max(20).default([]),
});

export const removeRiskSchema = z.object({
  userId: z.uuid(),
  reason: z.string().trim().min(1).max(1000),
});

export const moderationActionSchema = z.object({
  userId: z.uuid(),
  action: z.enum(MODERATION_ACTIONS),
  reason: z.string().trim().min(1, "A reason is required.").max(1000),
  reportId: z.uuid().optional(),
  targetType: z.string().trim().max(40).optional(),
  targetId: z.string().trim().max(200).optional(),
  evidenceRefs: z.array(z.uuid()).max(20).default([]),
  durationHours: z.number().int().min(1).max(24 * 365).optional(),
});

export const adminUserQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  status: z
    .enum(["active", "warning", "restricted", "suspended", "banned"])
    .optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});
