import { z } from "zod";

export const REPORT_TARGET_TYPES = [
  "user",
  "post",
  "comment",
  "story",
  "message",
  "conversation",
] as const;

export const REPORT_CATEGORIES = [
  "spam",
  "scam_fraud",
  "harassment",
  "bullying",
  "hate_speech",
  "threats_violence",
  "impersonation",
  "sexual_content",
  "exploitation",
  "child_safety",
  "privacy_violation",
  "self_harm",
  "dangerous_content",
  "intellectual_property",
  "other",
] as const;

export const REPORT_STATUSES = [
  "pending",
  "reviewing",
  "escalated",
  "resolved",
  "dismissed",
] as const;

export const REPORT_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export const REPORT_REASONS: Record<(typeof REPORT_CATEGORIES)[number], readonly string[]> = {
  spam: ["Unsolicited promotion", "Repetitive posts", "Fake engagement"],
  scam_fraud: ["Payment scam", "Phishing", "Impersonating a business"],
  harassment: ["Targeted harassment", "Threatening behavior", "Abusive language"],
  bullying: ["Bullying", "Intimidation", "Exclusion or humiliation"],
  hate_speech: ["Hate speech", "Slurs", "Attacking a protected group"],
  threats_violence: ["Threat of violence", "Incitement", "Dangerous instructions"],
  impersonation: ["Fake account", "Stolen identity", "Business impersonation"],
  sexual_content: ["Explicit content", "Unwanted sexual content", "Sexual solicitation"],
  exploitation: ["Exploitation", "Coercion", "Abuse of power"],
  child_safety: ["Minor safety concern", "Grooming", "Child exploitation"],
  privacy_violation: ["Private information", "Unauthorized media", "Doxxing"],
  self_harm: ["Self-harm content", "Suicide method", "Encouragement"],
  dangerous_content: ["Illegal activity", "Weapons", "Extremism"],
  intellectual_property: ["Copyright", "Trademark", "Stolen work"],
  other: ["Other policy concern"],
};

/** Severity is derived from category only; report volume never affects risk. */
export const ESCALATION_CATEGORIES = new Set([
  "child_safety",
  "threats_violence",
  "exploitation",
  "self_harm",
]);

export const createReportSchema = z.object({
  targetType: z.enum(REPORT_TARGET_TYPES),
  targetId: z.uuid(),
  category: z.enum(REPORT_CATEGORIES),
  reason: z.string().trim().max(120).optional().default(""),
  explanation: z.string().trim().max(2000).default(""),
  disclosureAccepted: z.literal(true),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

export const reportQuerySchema = z.object({
  status: z.enum(REPORT_STATUSES).optional(),
  category: z.enum(REPORT_CATEGORIES).optional(),
  priority: z.enum(REPORT_PRIORITIES).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});

export const updateReportSchema = z.object({
  status: z.enum(REPORT_STATUSES).optional(),
  priority: z.enum(REPORT_PRIORITIES).optional(),
  assigneeId: z.uuid().nullable().optional(),
  resolutionNotes: z.string().trim().max(2000).optional(),
});

export const evidenceNoteSchema = z.object({
  note: z.string().trim().min(1).max(1000),
});

export const appealSchema = z.object({
  moderationActionId: z.uuid().optional(),
  reportId: z.uuid().optional(),
  reason: z.string().trim().min(10, "Explain your appeal in at least 10 characters.").max(2000),
});

export const appealDecisionSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  resolution: z.string().trim().min(1).max(2000),
});
