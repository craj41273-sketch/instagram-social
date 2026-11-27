import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getTableConfig } from "drizzle-orm/pg-core";

import {
  appeals,
  auditLogs,
  closeFriends,
  conversationRequests,
  followRequests,
  moderationActions,
  portfolioProjects,
  profileLinks,
  profilePrivacySettings,
  profiles,
  reportEvidence,
  reportEvidenceAccess,
  reports,
  riskAssessmentHistory,
  riskAssessments,
  stories,
  storyAudienceEntries,
  trustHypes,
  userRelationships,
  users,
} from "@/lib/db/schema.ts";
import { calculateTrustFillPercent } from "@/lib/trust/constants.ts";
import {
  ACCOUNT_CATEGORIES,
  LINK_TYPES,
  MAX_TRUST_FILL,
  RELATIONSHIP_KINDS,
  STORY_AUDIENCES,
  TRUST_DENOMINATOR_FACTOR,
} from "@/lib/privacy/constants.ts";
import {
  accountCategorySchema,
  privacySettingsSchema,
  storyAudienceSchema,
} from "@/lib/validations/privacy.ts";
import {
  portfolioProjectSchema,
  profileLinkSchema,
} from "@/lib/validations/professional.ts";
import {
  ESCALATION_CATEGORIES,
  appealSchema,
  createReportSchema,
} from "@/lib/validations/reporting.ts";
import {
  MODERATION_ACTIONS,
  moderationActionSchema,
  riskAssessmentSchema,
} from "@/lib/validations/admin.ts";

const migration = readFileSync(
  new URL("../drizzle/0008_chubby_the_call.sql", import.meta.url),
  "utf8",
);
const journal = JSON.parse(
  readFileSync(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8"),
);

function names(config, key) {
  return new Set(config[key].map((item) => item.config?.name ?? item.name));
}

function assertChecks(table, expected) {
  const checks = names(getTableConfig(table), "checks");
  for (const name of expected) assert.ok(checks.has(name), `${name} missing on ${getTableConfig(table).name}`);
}

function assertIndexes(table, expected) {
  const indexes = names(getTableConfig(table), "indexes");
  for (const name of expected) assert.ok(indexes.has(name), `${name} missing on ${getTableConfig(table).name}`);
}

test("Block 11A schema keeps privacy, professional, trust, and safety state separate", () => {
  assertChecks(users, ["users_role_check", "users_account_status_check"]);
  assertChecks(profiles, ["profiles_account_category_check"]);
  assertChecks(stories, ["stories_audience_check"]);
  assertChecks(profilePrivacySettings, [
    "privacy_who_can_message_check",
    "privacy_conversation_privacy_check",
    "privacy_who_can_comment_check",
    "privacy_mention_permission_check",
    "privacy_contact_visibility_check",
    "privacy_profile_info_visibility_check",
    "privacy_story_audience_check",
    "privacy_story_controls_check",
  ]);
  assertIndexes(closeFriends, ["close_friends_owner_member_unique"]);
  assertChecks(closeFriends, ["close_friends_no_self_check"]);
  assertIndexes(storyAudienceEntries, ["story_audience_story_user_kind_unique"]);
  assertChecks(storyAudienceEntries, ["story_audience_kind_check"]);
  assertIndexes(userRelationships, ["user_relationships_actor_target_kind_unique"]);
  assertChecks(userRelationships, [
    "user_relationships_kind_check",
    "user_relationships_no_self_check",
  ]);
  assertIndexes(followRequests, ["follow_requests_requester_target_unique"]);
  assertChecks(followRequests, [
    "follow_requests_status_check",
    "follow_requests_no_self_check",
  ]);
  assertIndexes(profileLinks, ["profile_links_user_position_idx"]);
  assertIndexes(portfolioProjects, [
    "portfolio_projects_user_position_idx",
    "portfolio_projects_user_featured_idx",
  ]);
  assertIndexes(trustHypes, ["trust_hypes_giver_target_unique"]);
  assertChecks(trustHypes, ["trust_hypes_state_check", "trust_hypes_no_self_check"]);
  assertChecks(riskAssessments, ["risk_assessments_score_check"]);
  assertChecks(riskAssessmentHistory, ["risk_history_action_check"]);
  assertIndexes(conversationRequests, ["conversation_requests_conversation_sender_unique"]);
  assertChecks(conversationRequests, ["conversation_requests_no_self_check"]);
});

test("reports, evidence, appeals, moderation, and audit logs are auditable and bounded", () => {
  assertIndexes(reports, [
    "reports_duplicate_idx",
    "reports_status_priority_created_idx",
    "reports_target_idx",
  ]);
  assertChecks(reports, [
    "reports_target_type_check",
    "reports_category_check",
    "reports_status_check",
    "reports_priority_check",
  ]);

  const evidenceColumns = getTableConfig(reportEvidence).columns.map((column) => column.name);
  assert.equal(evidenceColumns.includes("updated_at"), false);
  assertChecks(reportEvidence, ["report_evidence_kind_check"]);
  assertChecks(reportEvidenceAccess, ["report_evidence_access_action_check"]);
  assertChecks(moderationActions, ["moderation_actions_action_check"]);
  assertChecks(appeals, ["appeals_status_check", "appeals_reason_check"]);
  assertChecks(auditLogs, ["audit_logs_action_check"]);

  assert.deepEqual(RELATIONSHIP_KINDS, ["block", "restrict", "mute"]);
  assert.deepEqual(STORY_AUDIENCES, ["followers", "close_friends", "custom"]);
  assert.equal(MODERATION_ACTIONS.includes("remove_content"), true);
});

test("Block 11A migration is additive and never deletes application data", () => {
  assert.equal(journal.entries.at(-1)?.tag, "0008_chubby_the_call");
  for (const name of [
    "appeals",
    "audit_logs",
    "close_friends",
    "conversation_requests",
    "follow_requests",
    "moderation_actions",
    "portfolio_projects",
    "profile_links",
    "profile_privacy_settings",
    "report_evidence",
    "report_evidence_access",
    "reports",
    "risk_assessment_history",
    "risk_assessments",
    "story_audience_entries",
    "trust_hypes",
    "user_relationships",
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE "${name}"`));
  }
  for (const column of ["is_private", "role", "account_status", "audience"]) {
    assert.match(migration, new RegExp(`ADD COLUMN "${column}"`));
  }
  assert.match(migration, /'moderation', 'report_update', 'appeal_update'/);
  for (const forbidden of [
    /DROP TABLE/i,
    /DROP COLUMN/i,
    /DELETE FROM/i,
    /TRUNCATE/i,
    /(^|\n)\s*UPDATE\s+/i,
  ]) {
    assert.equal(forbidden.test(migration), false, String(forbidden));
  }
});

test("trust is community-derived and uses the exact 20% formula with a 100 cap", () => {
  assert.equal(TRUST_DENOMINATOR_FACTOR, 0.2);
  assert.equal(MAX_TRUST_FILL, 100);
  assert.equal(calculateTrustFillPercent(1, 10), 50);
  assert.equal(calculateTrustFillPercent(2, 10), 100);
  assert.equal(calculateTrustFillPercent(5, 10), 100);
  assert.equal(calculateTrustFillPercent(0, 10), 0);
  assert.equal(calculateTrustFillPercent(1, 0), 0);
});

test("privacy and professional validation reject unsafe or privileged values", () => {
  const base = privacySettingsSchema.parse({
    isPrivate: false,
    whoCanMessage: "everyone",
    messageRequestsEnabled: true,
    readReceipts: true,
    activityStatus: true,
    conversationPrivacy: "participants",
    whoCanComment: "everyone",
    commentsEnabled: true,
    mentionPermission: "everyone",
    tagApproval: false,
    discoverable: true,
    contactVisibility: "followers",
    profileInfoVisibility: "everyone",
    hideLikeCounts: false,
    hideViewCounts: false,
    hiddenWords: [],
    storyAudience: "followers",
    storyReplies: "everyone",
    storyInteractions: "everyone",
  });
  assert.equal(base.storyAudience, "followers");
  assert.equal(
    privacySettingsSchema.safeParse({ ...base, storyAudience: "everyone" }).success,
    false,
  );
  assert.equal(
    privacySettingsSchema.safeParse({ ...base, hiddenWords: Array(101).fill("x") }).success,
    false,
  );

  const customAudience = storyAudienceSchema.parse({
    audience: "custom",
    userIds: ["11111111-1111-4111-8111-111111111111"],
  });
  assert.deepEqual(customAudience.excludedUserIds, []);
  assert.equal(
    storyAudienceSchema.safeParse({ audience: "everyone", userIds: ["not-a-uuid"] }).success,
    false,
  );

  const category = accountCategorySchema.parse({
    category: "developer",
    roles: ["developer"],
    headline: "Builds things",
    details: { focus: ["Web"] },
    verified: true,
  });
  assert.equal("verified" in category, false);
  assert.equal(accountCategorySchema.safeParse({ category: "admin", roles: [] }).success, false);

  assert.equal(profileLinkSchema.safeParse({
    label: "Portfolio",
    url: "javascript:alert(1)",
    linkType: "portfolio",
    position: 0,
  }).success, false);
  assert.equal(profileLinkSchema.safeParse({
    label: "Portfolio",
    url: "https://example.com/work",
    linkType: "portfolio",
    position: 0,
  }).success, true);
  assert.equal(portfolioProjectSchema.safeParse({
    title: "Project",
    liveUrl: "javascript:alert(1)",
  }).success, false);
  assert.equal(LINK_TYPES.includes("portfolio"), true);
  assert.equal(ACCOUNT_CATEGORIES.includes("developer"), true);
});

test("report, appeal, risk, and moderation input is validated without volume automation", () => {
  const report = createReportSchema.parse({
    targetType: "conversation",
    targetId: "11111111-1111-4111-8111-111111111111",
    category: "harassment",
    explanation: "Harassing messages",
    disclosureAccepted: true,
  });
  assert.equal(report.reason, "");
  assert.equal(createReportSchema.safeParse({ ...report, disclosureAccepted: false }).success, false);
  assert.equal(createReportSchema.safeParse({ ...report, category: "unknown" }).success, false);

  assert.equal(appealSchema.safeParse({ reason: "too short" }).success, false);
  assert.equal(appealSchema.safeParse({ reason: "Please review this decision again." }).success, true);
  assert.equal(ESCALATION_CATEGORIES.has("spam"), false);
  assert.equal(ESCALATION_CATEGORIES.has("child_safety"), true);

  assert.equal(riskAssessmentSchema.safeParse({
    userId: report.targetId,
    score: 101,
    reason: "Evidence",
  }).success, false);
  const risk = riskAssessmentSchema.parse({
    userId: report.targetId,
    score: 75,
    reason: "Evidence",
  });
  assert.equal(risk.score, 75);
  assert.equal(moderationActionSchema.safeParse({
    userId: report.targetId,
    action: "auto_ban",
    reason: "Report volume",
  }).success, false);
  assert.equal(moderationActionSchema.safeParse({
    userId: report.targetId,
    action: "warning",
    reason: "Manual review",
  }).success, true);
});
