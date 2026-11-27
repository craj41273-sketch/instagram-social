import "server-only";
import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import type { z } from "zod";

import { getDb } from "@/lib/db";
import {
  appeals,
  auditLogs,
  moderationActions,
  profiles,
  reports,
  riskAssessmentHistory,
  riskAssessments,
  users,
} from "@/lib/db/schema";
import { parseUserId } from "@/lib/db/profile-sql";
import type { StaffContext } from "@/lib/admin/authorization";
import { getProfessionalCounts } from "@/lib/professional/service";
import { getTrustStats, type TrustStats } from "@/lib/trust/service";
import { recordSafetyNotification } from "@/lib/notifications/safety";
import {
  MODERATION_ACTIONS,
  adminUserQuerySchema,
  moderationActionSchema,
  removeRiskSchema,
  riskAssessmentSchema,
} from "@/lib/validations/admin";
import { appealDecisionSchema } from "@/lib/validations/reporting";
import {
  AuthenticationError,
  AuthorizationError,
  DatabaseError,
  ValidationError,
} from "@/lib/errors";
import { logServerError } from "@/lib/logging";

/** Server-only moderation, risk, appeal, and audit services. No client imports. */

export type AdminUserQuery = z.input<typeof adminUserQuerySchema>;
export type ModerationActionInput = z.input<typeof moderationActionSchema>;
export type RiskAssessmentInput = z.input<typeof riskAssessmentSchema>;
export type RemoveRiskInput = z.input<typeof removeRiskSchema>;
export type AppealDecisionInput = z.input<typeof appealDecisionSchema>;

export interface DashboardData {
  totalUsers: number;
  activeUsers: number;
  pendingReports: number;
  reportsUnderReview: number;
  escalatedReports: number;
  resolvedReports: number;
  suspendedAccounts: number;
  bannedAccounts: number;
  pendingAppeals: number;
  recentModerationActions: Array<{
    id: string;
    userId: string;
    username: string | null;
    action: string;
    reason: string;
    createdAt: string;
  }>;
  prioritySafetyIssues: Array<{
    id: string;
    category: string;
    priority: string;
    status: string;
    targetType: string;
    targetId: string;
    createdAt: string;
  }>;
}

export interface RiskHistoryItem {
  id: string;
  actorId: string;
  action: "set" | "remove";
  previousScore: number | null;
  score: number | null;
  reason: string;
  evidenceRefs: string[];
  createdAt: string;
}

export interface RiskAssessmentData {
  score: number | null;
  reason: string | null;
  evidenceRefs: string[];
  assessedAt: string | null;
  history: RiskHistoryItem[];
}

export interface AdminUserItem {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: string;
  accountStatus: string;
  suspendedUntil: string | null;
  bannedAt: string | null;
  createdAt: string;
  trust: TrustStats;
  riskScore: number | null;
}

export interface AdminUserDetail {
  id: string;
  username: string;
  email: string;
  role: string;
  accountStatus: string;
  suspendedUntil: string | null;
  bannedAt: string | null;
  createdAt: string;
  updatedAt: string;
  profile: {
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    coverUrl: string | null;
    website: string | null;
    location: string | null;
    isPrivate: boolean;
    accountCategory: string;
    professionalRoles: string[];
  };
  trust: TrustStats;
  risk: RiskAssessmentData;
  moderationHistory: Array<{
    id: string;
    action: string;
    reason: string;
    targetType: string | null;
    targetId: string | null;
    createdAt: string;
  }>;
  reports: Array<{
    id: string;
    category: string;
    status: string;
    priority: string;
    createdAt: string;
  }>;
  counts: { links: number; projects: number };
}

export interface AppealItem {
  id: string;
  userId: string;
  username: string;
  moderationActionId: string | null;
  reportId: string | null;
  reason: string;
  status: string;
  resolution: string;
  createdAt: string;
  reviewedAt: string | null;
}

export interface AuditLogItem {
  id: string;
  actorId: string;
  actorUsername: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

const PAGE_SIZE = 20;
const DETAIL_LIMIT = 50;

function toIso(value: Date): string {
  return value.toISOString();
}

function nullableIso(value: Date | null): string | null {
  return value ? toIso(value) : null;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function readCount(rows: Array<{ count: number | string }>): number {
  return Number(rows[0]?.count ?? 0);
}

function requireRole(staff: StaffContext | null, adminOnly: boolean): StaffContext {
  if (!staff || !parseUserId(staff.userId)) {
    throw new AuthenticationError("Sign in to continue.");
  }
  const allowed = adminOnly ? staff.role === "admin" : staff.role !== "user";
  if (!allowed) throw new AuthorizationError();
  return staff;
}

async function requireTargetUser(userId: string): Promise<void> {
  const rows = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!rows[0]) throw new ValidationError("That account does not exist.");
}

async function writeAudit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, unknown>,
): Promise<void> {
  await getDb().insert(auditLogs).values({ actorId, action, entityType, entityId, details });
}

const PRIVATE_DETAIL_KEY = /content|message|note|text|payload|chat/i;

/** Audit details are admin-authored metadata, never private chat or note text. */
function sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (PRIVATE_DETAIL_KEY.test(key)) continue;
    safe[key] = typeof value === "string" ? value.slice(0, 200) : value;
  }
  return safe;
}

export async function getAdminDashboard(): Promise<DashboardData> {
  try {
    const result = await getDb().execute<Record<string, number | string>>(sql`
      SELECT
        (SELECT count(*)::int FROM ${users}) AS total_users,
        (
          SELECT count(*)::int FROM ${users}
          WHERE ${users.accountStatus} = 'active'
            AND ${users.bannedAt} is null
            AND (${users.suspendedUntil} is null or ${users.suspendedUntil} <= now())
        ) AS active_users,
        (SELECT count(*)::int FROM ${reports} WHERE ${reports.status} = 'pending') AS pending_reports,
        (SELECT count(*)::int FROM ${reports} WHERE ${reports.status} = 'reviewing') AS under_review,
        (SELECT count(*)::int FROM ${reports} WHERE ${reports.status} = 'escalated') AS escalated_reports,
        (SELECT count(*)::int FROM ${reports} WHERE ${reports.status} = 'resolved') AS resolved_reports,
        (SELECT count(*)::int FROM ${users} WHERE ${users.accountStatus} = 'suspended') AS suspended_accounts,
        (
          SELECT count(*)::int FROM ${users}
          WHERE ${users.accountStatus} = 'banned' OR ${users.bannedAt} is not null
        ) AS banned_accounts,
        (SELECT count(*)::int FROM ${appeals} WHERE ${appeals.status} = 'pending') AS pending_appeals
    `);
    const row = Array.isArray(result)
      ? result[0]
      : ((result as { rows?: Array<Record<string, number | string>> }).rows?.[0] ?? undefined);
    const metric = (key: string): number => Number(row?.[key] ?? 0);

    const [actionRows, safetyRows] = await Promise.all([
      getDb()
        .select({
          id: moderationActions.id,
          userId: moderationActions.userId,
          username: users.username,
          action: moderationActions.action,
          reason: moderationActions.reason,
          createdAt: moderationActions.createdAt,
        })
        .from(moderationActions)
        .leftJoin(users, eq(users.id, moderationActions.userId))
        .orderBy(desc(moderationActions.createdAt), desc(moderationActions.id))
        .limit(10),
      getDb()
        .select({
          id: reports.id,
          category: reports.category,
          priority: reports.priority,
          status: reports.status,
          targetType: reports.targetType,
          targetId: reports.targetId,
          createdAt: reports.createdAt,
        })
        .from(reports)
        .where(
          and(
            inArray(reports.priority, ["urgent", "high"]),
            inArray(reports.status, ["pending", "reviewing", "escalated"]),
          ),
        )
        .orderBy(
          sql`CASE ${reports.priority} WHEN 'urgent' THEN 0 ELSE 1 END`,
          desc(reports.createdAt),
          desc(reports.id),
        )
        .limit(10),
    ]);

    return {
      totalUsers: metric("total_users"),
      activeUsers: metric("active_users"),
      pendingReports: metric("pending_reports"),
      reportsUnderReview: metric("under_review"),
      escalatedReports: metric("escalated_reports"),
      resolvedReports: metric("resolved_reports"),
      suspendedAccounts: metric("suspended_accounts"),
      bannedAccounts: metric("banned_accounts"),
      pendingAppeals: metric("pending_appeals"),
      recentModerationActions: actionRows.map((item) => ({
        id: item.id,
        userId: item.userId,
        username: item.username,
        action: item.action,
        reason: item.reason,
        createdAt: toIso(item.createdAt),
      })),
      prioritySafetyIssues: safetyRows.map((item) => ({
        id: item.id,
        category: item.category,
        priority: item.priority,
        status: item.status,
        targetType: item.targetType,
        targetId: item.targetId,
        createdAt: toIso(item.createdAt),
      })),
    };
  } catch (error) {
    logServerError("admin.getAdminDashboard", error);
    throw new DatabaseError();
  }
}

/** A missing row is the distinct unassessed state, never score zero. */
export async function getRiskAssessment(userId: string): Promise<RiskAssessmentData> {
  if (!parseUserId(userId)) throw new ValidationError("Invalid account identity.");

  try {
    const [rows, historyRows] = await Promise.all([
      getDb()
        .select()
        .from(riskAssessments)
        .where(eq(riskAssessments.userId, userId))
        .limit(1),
      getDb()
        .select({
          id: riskAssessmentHistory.id,
          actorId: riskAssessmentHistory.actorId,
          action: riskAssessmentHistory.action,
          previousScore: riskAssessmentHistory.previousScore,
          score: riskAssessmentHistory.score,
          reason: riskAssessmentHistory.reason,
          evidenceRefs: riskAssessmentHistory.evidenceRefs,
          createdAt: riskAssessmentHistory.createdAt,
        })
        .from(riskAssessmentHistory)
        .where(eq(riskAssessmentHistory.userId, userId))
        .orderBy(desc(riskAssessmentHistory.createdAt), desc(riskAssessmentHistory.id))
        .limit(DETAIL_LIMIT),
    ]);
    const current = rows[0];
    return {
      score: current?.score ?? null,
      reason: current?.reason ?? null,
      evidenceRefs: current?.evidenceRefs ?? [],
      assessedAt: current ? toIso(current.assessedAt) : null,
      history: historyRows.map((item) => ({
        id: item.id,
        actorId: item.actorId,
        action: item.action as RiskHistoryItem["action"],
        previousScore: item.previousScore,
        score: item.score,
        reason: item.reason,
        evidenceRefs: item.evidenceRefs,
        createdAt: toIso(item.createdAt),
      })),
    };
  } catch (error) {
    logServerError("admin.getRiskAssessment", error);
    throw new DatabaseError();
  }
}

export async function setRiskAssessment(
  staff: StaffContext,
  input: RiskAssessmentInput,
): Promise<void> {
  const actor = requireRole(staff, true);
  const parsed = riskAssessmentSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("Please check the assessment details.");
  const values = parsed.data;

  try {
    await requireTargetUser(values.userId);
    const current = await getDb()
      .select({ score: riskAssessments.score })
      .from(riskAssessments)
      .where(eq(riskAssessments.userId, values.userId))
      .limit(1);
    const previousScore = current[0]?.score ?? null;
    const now = new Date();

    await getDb()
      .insert(riskAssessments)
      .values({
        userId: values.userId,
        score: values.score,
        reason: values.reason,
        evidenceRefs: values.evidenceRefs,
        assessedBy: actor.userId,
        assessedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: riskAssessments.userId,
        set: {
          score: values.score,
          reason: values.reason,
          evidenceRefs: values.evidenceRefs,
          assessedBy: actor.userId,
          assessedAt: now,
          updatedAt: now,
        },
      });

    await getDb().insert(riskAssessmentHistory).values({
      userId: values.userId,
      actorId: actor.userId,
      action: "set",
      previousScore,
      score: values.score,
      reason: values.reason,
      evidenceRefs: values.evidenceRefs,
      createdAt: now,
    });
    await writeAudit(actor.userId, "risk_set", "risk_assessment", values.userId, {
      previousScore,
      score: values.score,
    });
    await recordSafetyNotification(
      values.userId,
      actor.userId,
      "moderation",
      values.userId,
      "An administrator updated your risk assessment.",
    );
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AuthorizationError) throw error;
    logServerError("admin.setRiskAssessment", error);
    throw new DatabaseError();
  }
}

export async function removeRiskAssessment(
  staff: StaffContext,
  input: RemoveRiskInput,
): Promise<void> {
  const actor = requireRole(staff, true);
  const parsed = removeRiskSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("A reason is required.");
  const values = parsed.data;

  try {
    await requireTargetUser(values.userId);
    const current = await getDb()
      .select({ score: riskAssessments.score })
      .from(riskAssessments)
      .where(eq(riskAssessments.userId, values.userId))
      .limit(1);
    const previousScore = current[0]?.score ?? null;
    const now = new Date();

    await getDb()
      .delete(riskAssessments)
      .where(eq(riskAssessments.userId, values.userId));
    await getDb().insert(riskAssessmentHistory).values({
      userId: values.userId,
      actorId: actor.userId,
      action: "remove",
      previousScore,
      score: null,
      reason: values.reason,
      evidenceRefs: [],
      createdAt: now,
    });
    await writeAudit(actor.userId, "risk_removed", "risk_assessment", values.userId, {
      previousScore,
      score: null,
    });
    await recordSafetyNotification(
      values.userId,
      actor.userId,
      "moderation",
      values.userId,
      "An administrator removed your risk assessment.",
    );
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AuthorizationError) throw error;
    logServerError("admin.removeRiskAssessment", error);
    throw new DatabaseError();
  }
}

type ModerationAction = (typeof MODERATION_ACTIONS)[number];

/** Fixed, content-free notices; private evidence and message text are never copied. */
const MODERATION_MESSAGES: Record<ModerationAction, string> = {
  warning: "A warning was added to your account.",
  restrict: "Your account has been restricted.",
  suspend: "Your account has been suspended.",
  ban: "Your account has been banned.",
  restore: "Your account has been restored.",
  remove_content: "Content associated with your account was removed.",
  dismiss_report: "A report concerning your account was dismissed.",
  resolve_report: "A report concerning your account was resolved.",
  escalate_report: "A report concerning your account was escalated.",
};

const REPORT_STATUS_BY_ACTION: Partial<Record<ModerationAction, string>> = {
  dismiss_report: "dismissed",
  resolve_report: "resolved",
  escalate_report: "escalated",
};

/** Status changes are explicit; no report or hype volume ever changes risk. */
export async function applyModerationAction(
  staff: StaffContext,
  input: ModerationActionInput,
): Promise<void> {
  const actor = requireRole(staff, false);
  const parsed = moderationActionSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("Please check the moderation details.");
  const values = parsed.data;

  try {
    await requireTargetUser(values.userId);
    if (values.reportId) {
      const reportRows = await getDb()
        .select({ id: reports.id })
        .from(reports)
        .where(eq(reports.id, values.reportId))
        .limit(1);
      if (!reportRows[0]) throw new ValidationError("That report does not exist.");
    }
    if (values.targetId && !parseUserId(values.targetId)) {
      throw new ValidationError("That content identifier is invalid.");
    }

    const now = new Date();
    let expiresAt: Date | null = null;

    switch (values.action) {
      case "suspend":
        expiresAt = values.durationHours
          ? new Date(now.getTime() + values.durationHours * 60 * 60 * 1000)
          : null;
        await getDb()
          .update(users)
          .set({ accountStatus: "suspended", suspendedUntil: expiresAt, updatedAt: now })
          .where(eq(users.id, values.userId));
        break;
      case "ban":
        await getDb()
          .update(users)
          .set({ accountStatus: "banned", bannedAt: now, suspendedUntil: null, updatedAt: now })
          .where(eq(users.id, values.userId));
        break;
      case "restore":
        await getDb()
          .update(users)
          .set({
            accountStatus: "active",
            suspendedUntil: null,
            bannedAt: null,
            updatedAt: now,
          })
          .where(eq(users.id, values.userId));
        break;
      case "warning":
        await getDb()
          .update(users)
          .set({ accountStatus: "warning", updatedAt: now })
          .where(eq(users.id, values.userId));
        break;
      case "restrict":
        await getDb()
          .update(users)
          .set({ accountStatus: "restricted", updatedAt: now })
          .where(eq(users.id, values.userId));
        break;
      default:
        // remove_content records a decision only; no content row is deleted.
        break;
    }

    await getDb().insert(moderationActions).values({
      actorId: actor.userId,
      userId: values.userId,
      reportId: values.reportId ?? null,
      action: values.action,
      reason: values.reason,
      targetType: values.targetType ?? null,
      targetId: values.targetId ?? null,
      evidenceRefs: values.evidenceRefs,
      expiresAt,
    });

    await writeAudit(actor.userId, `moderation_${values.action}`, "user", values.userId, {
      action: values.action,
      reportId: values.reportId ?? null,
      targetType: values.targetType ?? null,
      targetId: values.targetId ?? null,
    });

    await recordSafetyNotification(
      values.userId,
      actor.userId,
      "moderation",
      values.reportId ?? values.userId,
      MODERATION_MESSAGES[values.action],
    );

    const reportStatus = values.reportId ? REPORT_STATUS_BY_ACTION[values.action] : undefined;
    if (values.reportId && reportStatus) {
      const resolved = reportStatus === "resolved" || reportStatus === "dismissed";
      await getDb()
        .update(reports)
        .set({
          status: reportStatus,
          resolvedBy: resolved ? actor.userId : null,
          resolvedAt: resolved ? now : null,
          updatedAt: now,
        })
        .where(eq(reports.id, values.reportId));
      await writeAudit(actor.userId, "report_status", "report", values.reportId, {
        status: reportStatus,
      });
    }
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AuthorizationError) throw error;
    logServerError("admin.applyModerationAction", error);
    throw new DatabaseError();
  }
}

export async function listAdminUsers(
  query: AdminUserQuery,
): Promise<{
  items: AdminUserItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const parsed = adminUserQuerySchema.safeParse(query);
  if (!parsed.success) throw new ValidationError("Invalid user query.");
  const { q, status, page } = parsed.data;

  const conditions: SQL[] = [];
  if (status) conditions.push(eq(users.accountStatus, status));
  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    const search = or(
      ilike(users.username, pattern),
      ilike(profiles.displayName, pattern),
      ilike(users.email, pattern),
    );
    if (search) conditions.push(search);
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  try {
    const [rows, countRows] = await Promise.all([
      getDb()
        .select({
          user: users,
          displayName: profiles.displayName,
          riskScore: riskAssessments.score,
        })
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .leftJoin(riskAssessments, eq(riskAssessments.userId, users.id))
        .where(where)
        .orderBy(desc(users.createdAt), desc(users.id))
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE),
      getDb()
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(where),
    ]);

    const items = await Promise.all(
      rows.map(async (row) => ({
        id: row.user.id,
        username: row.user.username,
        displayName: row.displayName ?? row.user.username,
        email: row.user.email,
        role: row.user.role,
        accountStatus: row.user.accountStatus,
        suspendedUntil: nullableIso(row.user.suspendedUntil),
        bannedAt: nullableIso(row.user.bannedAt),
        createdAt: toIso(row.user.createdAt),
        trust: await getTrustStats(row.user.id),
        riskScore: row.riskScore ?? null,
      })),
    );

    return {
      items,
      total: readCount(countRows),
      page,
      pageSize: PAGE_SIZE,
    };
  } catch (error) {
    logServerError("admin.listAdminUsers", error);
    throw new DatabaseError();
  }
}

/** Safe admin profile detail. Conversations and private messages are never queried. */
export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  if (!parseUserId(userId)) throw new ValidationError("Invalid account identity.");

  try {
    const rows = await getDb()
      .select({ user: users, profile: profiles })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;

    const [risk, trust, counts, moderationRows, reportRows] = await Promise.all([
      getRiskAssessment(userId),
      getTrustStats(userId),
      getProfessionalCounts(userId),
      getDb()
        .select({
          id: moderationActions.id,
          action: moderationActions.action,
          reason: moderationActions.reason,
          targetType: moderationActions.targetType,
          targetId: moderationActions.targetId,
          createdAt: moderationActions.createdAt,
        })
        .from(moderationActions)
        .where(eq(moderationActions.userId, userId))
        .orderBy(desc(moderationActions.createdAt), desc(moderationActions.id))
        .limit(DETAIL_LIMIT),
      getDb()
        .select({
          id: reports.id,
          category: reports.category,
          status: reports.status,
          priority: reports.priority,
          createdAt: reports.createdAt,
        })
        .from(reports)
        .where(and(eq(reports.targetType, "user"), eq(reports.targetId, userId)))
        .orderBy(desc(reports.createdAt), desc(reports.id))
        .limit(DETAIL_LIMIT),
    ]);

    return {
      id: row.user.id,
      username: row.user.username,
      email: row.user.email,
      role: row.user.role,
      accountStatus: row.user.accountStatus,
      suspendedUntil: nullableIso(row.user.suspendedUntil),
      bannedAt: nullableIso(row.user.bannedAt),
      createdAt: toIso(row.user.createdAt),
      updatedAt: toIso(row.user.updatedAt),
      profile: {
        displayName: row.profile?.displayName ?? row.user.username,
        bio: row.profile?.bio ?? null,
        avatarUrl: row.profile?.avatarUrl ?? null,
        coverUrl: row.profile?.coverUrl ?? null,
        website: row.profile?.website ?? null,
        location: row.profile?.location ?? null,
        isPrivate: row.profile?.isPrivate ?? false,
        accountCategory: row.profile?.accountCategory ?? "personal",
        professionalRoles: row.profile?.professionalRoles ?? [],
      },
      trust,
      risk,
      moderationHistory: moderationRows.map((item) => ({
        id: item.id,
        action: item.action,
        reason: item.reason,
        targetType: item.targetType,
        targetId: item.targetId,
        createdAt: toIso(item.createdAt),
      })),
      reports: reportRows.map((item) => ({
        id: item.id,
        category: item.category,
        status: item.status,
        priority: item.priority,
        createdAt: toIso(item.createdAt),
      })),
      counts: { links: counts.links, projects: counts.projects },
    };
  } catch (error) {
    logServerError("admin.getAdminUserDetail", error);
    throw new DatabaseError();
  }
}

export async function listAppeals(): Promise<AppealItem[]> {
  try {
    const rows = await getDb()
      .select({
        id: appeals.id,
        userId: appeals.userId,
        username: users.username,
        moderationActionId: appeals.moderationActionId,
        reportId: appeals.reportId,
        reason: appeals.reason,
        status: appeals.status,
        resolution: appeals.resolution,
        createdAt: appeals.createdAt,
        reviewedAt: appeals.reviewedAt,
      })
      .from(appeals)
      .innerJoin(users, eq(users.id, appeals.userId))
      .orderBy(desc(appeals.createdAt), desc(appeals.id))
      .limit(200);
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      username: row.username,
      moderationActionId: row.moderationActionId,
      reportId: row.reportId,
      reason: row.reason,
      status: row.status,
      resolution: row.resolution,
      createdAt: toIso(row.createdAt),
      reviewedAt: nullableIso(row.reviewedAt),
    }));
  } catch (error) {
    logServerError("admin.listAppeals", error);
    throw new DatabaseError();
  }
}

export async function decideAppeal(
  staff: StaffContext,
  appealId: string,
  input: AppealDecisionInput,
): Promise<void> {
  const actor = requireRole(staff, false);
  if (!parseUserId(appealId)) throw new ValidationError("Invalid appeal identity.");
  const parsed = appealDecisionSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("Please check the appeal decision.");
  const values = parsed.data;

  try {
    const rows = await getDb()
      .select()
      .from(appeals)
      .where(eq(appeals.id, appealId))
      .limit(1);
    const appeal = rows[0];
    if (!appeal) throw new ValidationError("That appeal does not exist.");

    await getDb()
      .update(appeals)
      .set({
        status: values.status,
        resolution: values.resolution,
        reviewedBy: actor.userId,
        reviewedAt: new Date(),
      })
      .where(eq(appeals.id, appealId));
    await writeAudit(actor.userId, "appeal_decision", "appeal", appealId, {
      status: values.status,
    });

    if (values.status === "approved" && appeal.moderationActionId) {
      const actionRows = await getDb()
        .select({ userId: moderationActions.userId })
        .from(moderationActions)
        .where(eq(moderationActions.id, appeal.moderationActionId))
        .limit(1);
      const targetId = actionRows[0]?.userId;
      if (targetId) {
        await applyModerationAction(actor, {
          userId: targetId,
          action: "restore",
          reason: "Appeal approved",
          evidenceRefs: [],
        });
      }
    }

    await recordSafetyNotification(
      appeal.userId,
      actor.userId,
      "appeal_update",
      appealId,
      values.status === "approved" ? "Your appeal was approved." : "Your appeal was rejected.",
    );
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AuthorizationError) throw error;
    logServerError("admin.decideAppeal", error);
    throw new DatabaseError();
  }
}

export async function listAuditLogs(
  page = 1,
): Promise<{
  items: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const safePage = Number.isInteger(page) && page > 0 ? Math.min(page, 10_000) : 1;

  try {
    const [rows, countRows] = await Promise.all([
      getDb()
        .select({
          log: auditLogs,
          actorUsername: users.username,
        })
        .from(auditLogs)
        .leftJoin(users, eq(users.id, auditLogs.actorId))
        .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
        .limit(PAGE_SIZE)
        .offset((safePage - 1) * PAGE_SIZE),
      getDb().select({ count: sql<number>`count(*)::int` }).from(auditLogs),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.log.id,
        actorId: row.log.actorId,
        actorUsername: row.actorUsername,
        action: row.log.action,
        entityType: row.log.entityType,
        entityId: row.log.entityId,
        details: sanitizeDetails(row.log.details),
        createdAt: toIso(row.log.createdAt),
      })),
      total: readCount(countRows),
      page: safePage,
      pageSize: PAGE_SIZE,
    };
  } catch (error) {
    logServerError("admin.listAuditLogs", error);
    throw new DatabaseError();
  }
}
