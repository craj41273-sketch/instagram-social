/** Shared Block 11A enums. Values match the database checks exactly. */

export const ACCOUNT_CATEGORIES = [
  "personal",
  "developer",
  "company",
  "creator",
  "marketer",
  "freelancer",
  "ecommerce",
  "designer",
  "photographer",
  "educator",
  "founder",
  "professional",
  "organization",
  "student",
  "other",
] as const;

export const PROFESSIONAL_ROLES = [
  "developer",
  "founder",
  "creator",
  "marketer",
  "designer",
  "freelancer",
  "seller",
  "educator",
  "professional",
] as const;

export const LINK_TYPES = [
  "website",
  "github",
  "linkedin",
  "instagram",
  "youtube",
  "tiktok",
  "x",
  "threads",
  "facebook",
  "behance",
  "dribbble",
  "pinterest",
  "snapchat",
  "discord",
  "telegram",
  "medium",
  "devto",
  "stackoverflow",
  "portfolio",
  "custom",
] as const;

export const PROJECT_STATUSES = [
  "planned",
  "in_progress",
  "completed",
  "archived",
] as const;

export const RELATIONSHIP_KINDS = ["block", "restrict", "mute"] as const;

export const STORY_AUDIENCES = ["followers", "close_friends", "custom"] as const;

export const FOLLOW_REQUEST_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "cancelled",
] as const;

/** Trust is derived only from these denominator rules; no admin override. */
export const TRUST_DENOMINATOR_FACTOR = 0.2;
export const MAX_TRUST_FILL = 100;
