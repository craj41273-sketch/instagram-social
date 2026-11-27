import "server-only";
import { and, desc, eq, gt, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import type { z } from "zod";

import { getDb } from "@/lib/db";
import {
  appeals,
  auditLogs,
  comments,
  conversationParticipants,
  conversations,
  messages,
  moderationActions,
  posts,
  profiles,
  reportEvidence,
  reportEvidenceAccess,
  reports,
  stories,
  users,
  type Report as ReportRow,
} from "@/lib/db/schema";
import { parseUserId } from "@/lib/db/profile-sql";
import { buildPostVisibilityCondition } from "@/lib/db/post-query";
import { canViewAccount, getPrivacyContext } from "@/lib/privacy/service";
import {
  ESCALATION_CATEGORIES,
  REPORT_CATEGORIES,
  REPORT_PRIORITIES,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
  appealSchema,
  createReportSchema,
  evidenceNoteSchema,
  reportQuerySchema,
  updateReportSchema,
  type CreateReportInput,
} from "@/lib/validations/reporting";
import {
  AuthorizationError,
  DatabaseError,
  ValidationError,
  isUniqueViolation,
} from "@/lib/errors";
import { logServerError } from "@/lib/logging";

/** Server-only report intake and staff review. Chat text never reaches notices. */

export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type ReportPriority = (typeof REPORT_PRIORITIES)[number];

export type ReportQuery = z.input<typeof reportQuerySchema> & {
  includeReporter?: boolean;
};
export type UpdateReportInput = z.input<typeof updateReportSchema>;

export interface ReportSummary {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  category: ReportCategory;
  reason: string | null;
  status: ReportStatus;
  priority: ReportPriority;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
  targetUsername: string | null;
  targetDisplayName: string | null;
  /** Present only when the staff caller explicitly requests it. */
  reporterId?: string | null;
}

export interface ReportEvidenceItem {
  id: string;
  kind: "chat_snapshot" | "target";
  payload: Record<string, unknown>;
  capturedAt: string;
  createdAt: string;
}

export interface ReportNoteItem {
  id: string;
  actorId: string;
  note: string;
  createdAt: string;
}

export interface ReportDetail extends ReportSummary {
  explanation: string;
  resolutionNotes: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
  evidence: ReportEvidenceItem[];
  notes: ReportNoteItem[];
}

const PAGE_SIZE = 20;
const SURROUNDING_WINDOW = 7;

function toIso(value: Date): string {
  return value.toISOString();
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

interface JoinedReportRow {
  report: ReportRow;
  targetUsername: string | null;
  targetDisplayName: string | null;
}

function mapSummary(row: JoinedReportRow, includeReporter: boolean): ReportSummary {
  const base: ReportSummary = {
    id: row.report.id,
    targetType: row.report.targetType as ReportTargetType,
    targetId: row.report.targetId,
    category: row.report.category as ReportCategory,
    reason: row.report.reason,
    status: row.report.status as ReportStatus,
    priority: row.report.priority as ReportPriority,
    assigneeId: row.report.assigneeId,
    createdAt: toIso(row.report.createdAt),
    updatedAt: toIso(row.report.updatedAt),
    targetUsername: row.targetUsername,
    targetDisplayName: row.targetDisplayName,
  };
  return includeReporter ? { ...base, reporterId: row.report.reporterId } : base;
}

/** Only verified, active application accounts may file reports. */
async function requireActiveReporter(reporterId: string): Promise<void> {
  const rows = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.id, reporterId),
        eq(users.accountStatus, "active"),
        sql`${users.bannedAt} is null`,
        sql`(${users.suspendedUntil} is null or ${users.suspendedUntil} <= now())`,
      ),
    )
    .limit(1);
  if (rows.length === 0) {
    throw new AuthorizationError("Only active accounts can submit reports.");
  }
}

async function requireConversationParticipant(
  reporterId: string,
  conversationId: string,
): Promise<void> {
  const rows = await getDb()
    .select({ id: conversationParticipants.id })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, reporterId),
      ),
    )
    .limit(1);
  if (rows.length === 0) {
    throw new AuthorizationError("You are not a participant in that conversation.");
  }
}

/**
 * Resolves the reported entity from the database; a fabricated ID yields no
 * report. Privacy and participant checks are repeated server side.
 */
async function assertAuthorizedTarget(
  reporterId: string,
  targetType: ReportTargetType,
  targetId: string,
): Promise<string | null> {
  if (targetType === "user") {
    const rows = await getDb()
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, targetId))
      .limit(1);
    if (!rows[0]) throw new ValidationError("That account does not exist.");
    if (!canViewAccount(await getPrivacyContext(reporterId, targetId))) {
      throw new AuthorizationError("That account is not available to report.");
    }
    return null;
  }

  if (targetType === "post") {
    const rows = await getDb()
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.id, targetId), buildPostVisibilityCondition(reporterId)))
      .limit(1);
    if (!rows[0]) throw new ValidationError("That post is not available to report.");
    return null;
  }

  if (targetType === "comment" || targetType === "story") {
    const rows =
      targetType === "comment"
        ? await getDb()
            .select({ ownerId: comments.userId })
            .from(comments)
            .where(eq(comments.id, targetId))
            .limit(1)
        : await getDb()
            .select({ ownerId: stories.userId })
            .from(stories)
            .where(eq(stories.id, targetId))
            .limit(1);
    const ownerId = rows[0]?.ownerId;
    if (!ownerId) throw new ValidationError("That content does not exist.");
    if (!canViewAccount(await getPrivacyContext(reporterId, ownerId))) {
      throw new AuthorizationError("That content is not available to report.");
    }
    return null;
  }

  if (targetType === "message") {
    const rows = await getDb()
      .select({ conversationId: messages.conversationId })
      .from(messages)
      .where(eq(messages.id, targetId))
      .limit(1);
    const conversationId = rows[0]?.conversationId;
    if (!conversationId) throw new ValidationError("That message does not exist.");
    await requireConversationParticipant(reporterId, conversationId);
    return conversationId;
  }

  const rows = await getDb()
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.id, targetId))
    .limit(1);
  if (!rows[0]) throw new ValidationError("That conversation does not exist.");
  await requireConversationParticipant(reporterId, targetId);
  return targetId;
}

const chatColumns = {
  id: messages.id,
  senderId: messages.senderId,
  content: messages.content,
  createdAt: messages.createdAt,
  deletedAt: messages.deletedAt,
};

type ChatRow = {
  id: string;
  senderId: string;
  content: string;
  createdAt: Date;
  deletedAt: Date | null;
};

/** Tombstoned messages keep their ID and timestamp but never their text. */
function mapChatMessage(row: ChatRow) {
  return {
    id: row.id,
    senderId: row.senderId,
    content: row.deletedAt ? "" : row.content,
    createdAt: toIso(row.createdAt),
    deleted: row.deletedAt !== null,
  };
}

/** At most 15 messages: the selected one plus seven on each side. */
async function buildChatPayload(
  conversationId: string,
  reportedMessageId: string | null,
  input: CreateReportInput,
  capturedAt: string,
): Promise<Record<string, unknown>> {
  const participantRows = await getDb()
    .select({ userId: users.id, username: users.username })
    .from(conversationParticipants)
    .innerJoin(users, eq(users.id, conversationParticipants.userId))
    .where(eq(conversationParticipants.conversationId, conversationId));

  const selectedRows = reportedMessageId
    ? await getDb()
        .select(chatColumns)
        .from(messages)
        .where(
          and(eq(messages.id, reportedMessageId), eq(messages.conversationId, conversationId)),
        )
        .limit(1)
    : await getDb()
        .select(chatColumns)
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.createdAt), desc(messages.id))
        .limit(1);
  const selected = selectedRows[0];

  let surrounding: ChatRow[] = [];
  if (selected) {
    const before = await getDb()
      .select(chatColumns)
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          or(
            lt(messages.createdAt, selected.createdAt),
            and(eq(messages.createdAt, selected.createdAt), lt(messages.id, selected.id)),
          ),
        ),
      )
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(SURROUNDING_WINDOW);
    const after = await getDb()
      .select(chatColumns)
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          or(
            gt(messages.createdAt, selected.createdAt),
            and(eq(messages.createdAt, selected.createdAt), gt(messages.id, selected.id)),
          ),
        ),
      )
      .orderBy(messages.createdAt, messages.id)
      .limit(SURROUNDING_WINDOW);
    surrounding = [...before.reverse(), ...after];
  }

  return {
    conversationId,
    participants: participantRows.map((row) => ({
      userId: row.userId,
      username: row.username,
    })),
    reportedMessageId,
    selectedMessage: selected ? mapChatMessage(selected) : null,
    surroundingMessages: surrounding.map(mapChatMessage),
    capturedAt,
    category: input.category,
    explanation: input.explanation,
    mediaRefs: [],
  };
}

/**
 * Rate limiting belongs to the calling action. Severity comes from category
 * alone: report volume never changes risk or triggers any account punishment.
 */
export async function createReport(
  reporterId: string,
  input: CreateReportInput,
): Promise<{ id: string; duplicate: boolean }> {
  if (!parseUserId(reporterId)) throw new ValidationError("Invalid account identity.");
  const parsed = createReportSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("Please check the report details.");
  const values = parsed.data;

  const duplicateWhere = and(
    eq(reports.reporterId, reporterId),
    eq(reports.targetType, values.targetType),
    eq(reports.targetId, values.targetId),
    eq(reports.category, values.category),
  );

  try {
    await requireActiveReporter(reporterId);
    const conversationId = await assertAuthorizedTarget(
      reporterId,
      values.targetType,
      values.targetId,
    );

    const existing = await getDb()
      .select({ id: reports.id })
      .from(reports)
      .where(duplicateWhere)
      .limit(1);
    if (existing[0]) return { id: existing[0].id, duplicate: true };

    const priority = ESCALATION_CATEGORIES.has(values.category) ? "urgent" : "normal";
    const capturedAt = new Date().toISOString();

    let inserted: Array<{ id: string }>;
    try {
      inserted = await getDb()
        .insert(reports)
        .values({
          reporterId,
          targetType: values.targetType,
          targetId: values.targetId,
          category: values.category,
          reason: values.reason || null,
          explanation: values.explanation,
          priority,
        })
        .returning({ id: reports.id });
    } catch (error) {
      if (isUniqueViolation(error)) {
        const raced = await getDb()
          .select({ id: reports.id })
          .from(reports)
          .where(duplicateWhere)
          .limit(1);
        if (raced[0]) return { id: raced[0].id, duplicate: true };
      }
      throw error;
    }
    const reportId = inserted[0]?.id;
    if (!reportId) throw new DatabaseError();

    const isChat = conversationId !== null;
    const payload = conversationId
      ? await buildChatPayload(
          conversationId,
          values.targetType === "message" ? values.targetId : null,
          values,
          capturedAt,
        )
      : {
          targetType: values.targetType,
          targetId: values.targetId,
          capturedAt,
          category: values.category,
        };
    await getDb().insert(reportEvidence).values({
      reportId,
      kind: isChat ? "chat_snapshot" : "target",
      payload,
      capturedAt: new Date(capturedAt),
    });

    return { id: reportId, duplicate: false };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AuthorizationError) throw error;
    logServerError("reporting.createReport", error);
    throw new DatabaseError();
  }
}

export async function listReports(
  query: ReportQuery,
): Promise<{
  items: ReportSummary[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const parsed = reportQuerySchema.safeParse(query);
  if (!parsed.success) throw new ValidationError("Invalid report query.");
  const filters = parsed.data;
  const includeReporter = query.includeReporter === true;

  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(reports.status, filters.status));
  if (filters.category) conditions.push(eq(reports.category, filters.category));
  if (filters.priority) conditions.push(eq(reports.priority, filters.priority));
  if (filters.q) {
    const pattern = `%${escapeLike(filters.q)}%`;
    const search = or(
      ilike(reports.targetId, pattern),
      ilike(reports.reason, pattern),
      ilike(reports.explanation, pattern),
    );
    if (search) conditions.push(search);
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  try {
    const [rows, countRows] = await Promise.all([
      getDb()
        .select({
          report: reports,
          targetUsername: users.username,
          targetDisplayName: profiles.displayName,
        })
        .from(reports)
        .leftJoin(
          users,
          and(eq(reports.targetType, "user"), sql`${users.id}::text = ${reports.targetId}`),
        )
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(where)
        .orderBy(
          sql`CASE ${reports.priority} WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END`,
          desc(reports.createdAt),
          desc(reports.id),
        )
        .limit(PAGE_SIZE)
        .offset((filters.page - 1) * PAGE_SIZE),
      getDb()
        .select({ count: sql<number>`count(*)::int` })
        .from(reports)
        .where(where),
    ]);

    return {
      items: rows.map((row) => mapSummary(row, includeReporter)),
      total: Number(countRows[0]?.count ?? 0),
      page: filters.page,
      pageSize: PAGE_SIZE,
    };
  } catch (error) {
    logServerError("reporting.listReports", error);
    throw new DatabaseError();
  }
}

/** The route checks staff authority; this read also gates reporter identity by role. */
export async function getReportDetail(
  reportId: string,
  staffUserId: string,
): Promise<ReportDetail | null> {
  if (!parseUserId(reportId) || !parseUserId(staffUserId)) {
    throw new ValidationError("Invalid report identity.");
  }

  try {
    const rows = await getDb()
      .select({
        report: reports,
        targetUsername: users.username,
        targetDisplayName: profiles.displayName,
      })
      .from(reports)
      .leftJoin(
        users,
        and(eq(reports.targetType, "user"), sql`${users.id}::text = ${reports.targetId}`),
      )
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(reports.id, reportId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;

    const [staffRows, evidenceRows, noteRows] = await Promise.all([
      getDb()
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, staffUserId))
        .limit(1),
      getDb()
        .select({
          id: reportEvidence.id,
          kind: reportEvidence.kind,
          payload: reportEvidence.payload,
          capturedAt: reportEvidence.capturedAt,
          createdAt: reportEvidence.createdAt,
        })
        .from(reportEvidence)
        .where(eq(reportEvidence.reportId, reportId))
        .orderBy(desc(reportEvidence.createdAt), desc(reportEvidence.id)),
      getDb()
        .select({
          id: reportEvidenceAccess.id,
          actorId: reportEvidenceAccess.actorId,
          note: reportEvidenceAccess.note,
          createdAt: reportEvidenceAccess.createdAt,
        })
        .from(reportEvidenceAccess)
        .where(
          and(eq(reportEvidenceAccess.reportId, reportId), eq(reportEvidenceAccess.action, "note")),
        )
        .orderBy(desc(reportEvidenceAccess.createdAt), desc(reportEvidenceAccess.id)),
    ]);

    await getDb()
      .insert(reportEvidenceAccess)
      .values({ reportId, actorId: staffUserId, action: "view" });

    const summary = mapSummary(row, staffRows[0]?.role === "admin");
    return {
      ...summary,
      explanation: row.report.explanation,
      resolutionNotes: row.report.resolutionNotes,
      resolvedBy: row.report.resolvedBy,
      resolvedAt: row.report.resolvedAt ? toIso(row.report.resolvedAt) : null,
      evidence: evidenceRows.map((item) => ({
        id: item.id,
        kind: item.kind as ReportEvidenceItem["kind"],
        payload: item.payload,
        capturedAt: toIso(item.capturedAt),
        createdAt: toIso(item.createdAt),
      })),
      notes: noteRows
        .filter((item) => item.note !== null)
        .map((item) => ({
          id: item.id,
          actorId: item.actorId,
          note: item.note as string,
          createdAt: toIso(item.createdAt),
        })),
    };
  } catch (error) {
    logServerError("reporting.getReportDetail", error);
    throw new DatabaseError();
  }
}

export async function updateReport(
  reportId: string,
  staffUserId: string,
  input: UpdateReportInput,
): Promise<void> {
  if (!parseUserId(reportId) || !parseUserId(staffUserId)) {
    throw new ValidationError("Invalid report identity.");
  }
  const parsed = updateReportSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("Invalid report update.");
  const values = parsed.data;

  try {
    const existing = await getDb()
      .select({ id: reports.id })
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);
    if (!existing[0]) throw new ValidationError("That report does not exist.");

    if (values.assigneeId) {
      const assignee = await getDb()
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, values.assigneeId))
        .limit(1);
      if (!assignee[0]) throw new ValidationError("That assignee does not exist.");
    }

    const set: Partial<typeof reports.$inferInsert> = { updatedAt: new Date() };
    if (values.status !== undefined) {
      set.status = values.status;
      const closed = values.status === "resolved" || values.status === "dismissed";
      set.resolvedBy = closed ? staffUserId : null;
      set.resolvedAt = closed ? new Date() : null;
    }
    if (values.priority !== undefined) set.priority = values.priority;
    if (values.assigneeId !== undefined) set.assigneeId = values.assigneeId;
    if (values.resolutionNotes !== undefined) set.resolutionNotes = values.resolutionNotes;

    await getDb().update(reports).set(set).where(eq(reports.id, reportId));
    await getDb().insert(auditLogs).values({
      actorId: staffUserId,
      action: "report_update",
      entityType: "report",
      entityId: reportId,
      details: {
        status: values.status ?? null,
        priority: values.priority ?? null,
        assigneeId: values.assigneeId ?? null,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logServerError("reporting.updateReport", error);
    throw new DatabaseError();
  }
}

export async function addEvidenceNote(
  reportId: string,
  staffUserId: string,
  note: string,
): Promise<void> {
  if (!parseUserId(reportId) || !parseUserId(staffUserId)) {
    throw new ValidationError("Invalid report identity.");
  }
  const parsed = evidenceNoteSchema.safeParse({ note });
  if (!parsed.success) throw new ValidationError("Please enter a note.");

  try {
    const existing = await getDb()
      .select({ id: reports.id })
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);
    if (!existing[0]) throw new ValidationError("That report does not exist.");

    await getDb().insert(reportEvidenceAccess).values({
      reportId,
      actorId: staffUserId,
      action: "note",
      note: parsed.data.note,
    });
    await getDb().insert(auditLogs).values({
      actorId: staffUserId,
      action: "report_note",
      entityType: "report",
      entityId: reportId,
      details: { hasNote: true },
    });
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logServerError("reporting.addEvidenceNote", error);
    throw new DatabaseError();
  }
}

/** Admin user detail: reports targeting the account, never reporter identity. */
export async function listReportsForUser(userId: string): Promise<ReportSummary[]> {
  if (!parseUserId(userId)) throw new ValidationError("Invalid account identity.");

  try {
    const rows = await getDb()
      .select({ report: reports })
      .from(reports)
      .where(and(eq(reports.targetType, "user"), eq(reports.targetId, userId)))
      .orderBy(desc(reports.createdAt), desc(reports.id));
    return rows.map((row) =>
      mapSummary({ ...row, targetUsername: null, targetDisplayName: null }, false),
    );
  } catch (error) {
    logServerError("reporting.listReportsForUser", error);
    throw new DatabaseError();
  }
}

export async function getReportStatusForReporter(
  reporterId: string,
  reportId: string,
): Promise<ReportStatus | null> {
  if (!parseUserId(reporterId) || !parseUserId(reportId)) {
    throw new ValidationError("Invalid report identity.");
  }

  try {
    const rows = await getDb()
      .select({ status: reports.status })
      .from(reports)
      .where(and(eq(reports.id, reportId), eq(reports.reporterId, reporterId)))
      .limit(1);
    return (rows[0]?.status as ReportStatus | undefined) ?? null;
  } catch (error) {
    logServerError("reporting.getReportStatusForReporter", error);
    throw new DatabaseError();
  }
}

/** Reporter-facing list: bounded, newest first, and never exposes reporter IDs. */
export async function listMyReports(reporterId: string): Promise<ReportSummary[]> {
  if (!parseUserId(reporterId)) throw new ValidationError("Invalid account identity.");

  try {
    const rows = await getDb()
      .select({ report: reports })
      .from(reports)
      .where(eq(reports.reporterId, reporterId))
      .orderBy(desc(reports.createdAt), desc(reports.id))
      .limit(50);
    return rows.map((row) =>
      mapSummary({ ...row, targetUsername: null, targetDisplayName: null }, false),
    );
  } catch (error) {
    logServerError("reporting.listMyReports", error);
    throw new DatabaseError();
  }
}

/**
 * User-facing appeal intake. References are checked against the session owner,
 * and only the text the user wrote is stored as the reason.
 */
export async function createAppeal(
  userId: string,
  input: z.input<typeof appealSchema>,
): Promise<{ id: string; duplicate: boolean }> {
  if (!parseUserId(userId)) throw new ValidationError("Invalid account identity.");
  const parsed = appealSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError("Please check your appeal details.");
  const values = parsed.data;

  if (!values.moderationActionId && !values.reportId) {
    throw new ValidationError("Choose a report or moderation decision to appeal.");
  }

  try {
    if (values.moderationActionId) {
      const actionRows = await getDb()
        .select({ id: moderationActions.id })
        .from(moderationActions)
        .where(
          and(
            eq(moderationActions.id, values.moderationActionId),
            eq(moderationActions.userId, userId),
          ),
        )
        .limit(1);
      if (!actionRows[0]) {
        throw new ValidationError("That moderation decision is not available to appeal.");
      }
    }

    if (values.reportId) {
      const reportRows = await getDb()
        .select({ id: reports.id })
        .from(reports)
        .where(
          and(
            eq(reports.id, values.reportId),
            or(
              eq(reports.reporterId, userId),
              and(eq(reports.targetType, "user"), eq(reports.targetId, userId)),
            ),
          ),
        )
        .limit(1);
      if (!reportRows[0]) {
        throw new ValidationError("That report is not available to appeal.");
      }
    }

    const duplicateWhere = and(
      eq(appeals.userId, userId),
      eq(appeals.status, "pending"),
      sql`${appeals.moderationActionId} is not distinct from ${values.moderationActionId ?? null}`,
      sql`${appeals.reportId} is not distinct from ${values.reportId ?? null}`,
    );
    const existing = await getDb()
      .select({ id: appeals.id })
      .from(appeals)
      .where(duplicateWhere)
      .limit(1);
    if (existing[0]) return { id: existing[0].id, duplicate: true };

    const inserted = await getDb()
      .insert(appeals)
      .values({
        userId,
        moderationActionId: values.moderationActionId ?? null,
        reportId: values.reportId ?? null,
        reason: values.reason,
        status: "pending",
      })
      .returning({ id: appeals.id });
    const appealId = inserted[0]?.id;
    if (!appealId) throw new DatabaseError();

    await getDb().insert(auditLogs).values({
      actorId: userId,
      action: "appeal_submitted",
      entityType: "appeal",
      entityId: appealId,
      details: {
        appealId,
        moderationActionId: values.moderationActionId ?? null,
        reportId: values.reportId ?? null,
      },
    });

    return { id: appealId, duplicate: false };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logServerError("reporting.createAppeal", error);
    throw new DatabaseError();
  }
}

/** User-facing appeal history with the referenced action, never private chat text. */
export async function listMyAppeals(
  userId: string,
): Promise<
  Array<{
    id: string;
    reason: string;
    status: string;
    resolution: string;
    moderationActionId: string | null;
    reportId: string | null;
    createdAt: string;
    reviewedAt: string | null;
    action: { action: string; reason: string; createdAt: string } | null;
  }>
> {
  if (!parseUserId(userId)) throw new ValidationError("Invalid account identity.");

  try {
    const rows = await getDb()
      .select({
        appeal: appeals,
        action: {
          action: moderationActions.action,
          reason: moderationActions.reason,
          createdAt: moderationActions.createdAt,
        },
      })
      .from(appeals)
      .leftJoin(moderationActions, eq(appeals.moderationActionId, moderationActions.id))
      .where(eq(appeals.userId, userId))
      .orderBy(desc(appeals.createdAt), desc(appeals.id))
      .limit(50);

    return rows.map((row) => ({
      id: row.appeal.id,
      reason: row.appeal.reason,
      status: row.appeal.status,
      resolution: row.appeal.resolution,
      moderationActionId: row.appeal.moderationActionId,
      reportId: row.appeal.reportId,
      createdAt: toIso(row.appeal.createdAt),
      reviewedAt: row.appeal.reviewedAt ? toIso(row.appeal.reviewedAt) : null,
      action: row.action?.action
        ? {
            action: row.action.action,
            reason: row.action.reason,
            createdAt: toIso(row.action.createdAt),
          }
        : null,
    }));
  } catch (error) {
    logServerError("reporting.listMyAppeals", error);
    throw new DatabaseError();
  }
}
