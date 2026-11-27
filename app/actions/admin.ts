"use server";

import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";
import { requireStaff } from "@/lib/admin/authorization";
import {
  applyModerationAction,
  decideAppeal,
  removeRiskAssessment,
  setRiskAssessment,
} from "@/lib/admin/service";
import {
  addEvidenceNote,
  updateReport,
} from "@/lib/reporting/service";
import { toSafeMessage } from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { toFormErrors } from "@/lib/validations/auth";
import {
  moderationActionSchema,
  removeRiskSchema,
  riskAssessmentSchema,
} from "@/lib/validations/admin";
import {
  appealDecisionSchema,
  evidenceNoteSchema,
  updateReportSchema,
} from "@/lib/validations/reporting";
import type { ActionState } from "@/app/actions/settings-types";

/** Staff identity always comes from the session; form IDs are references only. */

const ADMIN_PATHS = [
  "/admin",
  "/admin/reports",
  "/admin/users",
  "/admin/appeals",
  "/admin/moderation",
  "/admin/audit-logs",
] as const;

function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(formData: FormData, key: string): string | undefined {
  const value = formText(formData, key);
  return value || undefined;
}

function formNumber(formData: FormData, key: string): number | undefined {
  const raw = formText(formData, key);
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : Number.NaN;
}

/** Malformed JSON becomes a typed value the Zod schema rejects safely. */
function formJson(formData: FormData, key: string): unknown {
  const raw = formText(formData, key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function rateLimited(staffUserId: string, name: string): boolean {
  const key = `admin:${name}:${staffUserId}`;
  return !consumeRateLimit(key, 15, 60_000).allowed;
}

function failure(scope: string, error: unknown): ActionState {
  logServerError(scope, error);
  return { status: "error", message: toSafeMessage(error) };
}

function invalid(message: string, error?: ZodError): ActionState {
  return {
    status: "error",
    message,
    errors: error ? toFormErrors<Record<string, unknown>>(error) : undefined,
  };
}

function revalidateAdmin(details: string[] = []): void {
  for (const path of ADMIN_PATHS) revalidatePath(path);
  for (const path of details) revalidatePath(path);
  revalidatePath("/admin/reports/[id]", "page");
  revalidatePath("/admin/users/[id]", "page");
}

/** Updates a report's workflow fields; staff authority is rechecked here. */
export async function updateReportAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let staff;
  try {
    staff = await requireStaff();
  } catch (error) {
    return failure("admin.updateReport.staff", error);
  }
  if (rateLimited(staff.userId, "report-update")) {
    return { status: "error", message: "Too many changes. Please wait a moment." };
  }

  const reportId = formText(formData, "reportId");
  const parsed = updateReportSchema.safeParse({
    status: optionalText(formData, "status"),
    priority: optionalText(formData, "priority"),
    assigneeId: optionalText(formData, "assigneeId"),
    resolutionNotes: optionalText(formData, "resolutionNotes"),
  });
  if (!parsed.success) return invalid("Please check the report update.", parsed.error);

  try {
    await updateReport(reportId, staff.userId, parsed.data);
    revalidateAdmin([`/admin/reports/${reportId}`]);
    return { status: "success", message: "Report updated." };
  } catch (error) {
    return failure("admin.updateReport", error);
  }
}

/** Adds a staff note to the evidence-access timeline. */
export async function addEvidenceNoteAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let staff;
  try {
    staff = await requireStaff();
  } catch (error) {
    return failure("admin.addEvidenceNote.staff", error);
  }
  if (rateLimited(staff.userId, "report-note")) {
    return { status: "error", message: "Too many notes. Please wait a moment." };
  }

  const reportId = formText(formData, "reportId");
  const parsed = evidenceNoteSchema.safeParse({ note: formText(formData, "note") });
  if (!parsed.success) return invalid("Please enter a note.", parsed.error);

  try {
    await addEvidenceNote(reportId, staff.userId, parsed.data.note);
    revalidateAdmin([`/admin/reports/${reportId}`]);
    return { status: "success", message: "Note added." };
  } catch (error) {
    return failure("admin.addEvidenceNote", error);
  }
}

/** Risk assessment is a deliberate admin-only act, never derived from reports. */
export async function setRiskAssessmentAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let staff;
  try {
    staff = await requireStaff(true);
  } catch (error) {
    return failure("admin.setRisk.staff", error);
  }
  if (rateLimited(staff.userId, "risk-set")) {
    return { status: "error", message: "Too many risk changes. Please wait a moment." };
  }

  const parsed = riskAssessmentSchema.safeParse({
    userId: formText(formData, "userId"),
    score: formNumber(formData, "score"),
    reason: formText(formData, "reason"),
    evidenceRefs: formJson(formData, "evidenceRefs"),
  });
  if (!parsed.success) return invalid("Please check the assessment.", parsed.error);

  try {
    await setRiskAssessment(staff, parsed.data);
    revalidateAdmin([`/admin/users/${parsed.data.userId}`]);
    return { status: "success", message: "Risk assessment saved." };
  } catch (error) {
    return failure("admin.setRisk", error);
  }
}

/** Removing an assessment is high impact and still requires admin authority. */
export async function removeRiskAssessmentAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let staff;
  try {
    staff = await requireStaff(true);
  } catch (error) {
    return failure("admin.removeRisk.staff", error);
  }
  if (rateLimited(staff.userId, "risk-remove")) {
    return { status: "error", message: "Too many risk changes. Please wait a moment." };
  }

  const parsed = removeRiskSchema.safeParse({
    userId: formText(formData, "userId"),
    reason: formText(formData, "reason"),
  });
  if (!parsed.success) return invalid("A reason is required.", parsed.error);

  try {
    await removeRiskAssessment(staff, parsed.data);
    revalidateAdmin([`/admin/users/${parsed.data.userId}`]);
    return { status: "success", message: "Risk assessment removed." };
  } catch (error) {
    return failure("admin.removeRisk", error);
  }
}

/** Records an explicit moderation decision; no automatic punishment is inferred. */
export async function applyModerationActionAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let staff;
  try {
    staff = await requireStaff();
  } catch (error) {
    return failure("admin.moderation.staff", error);
  }
  if (rateLimited(staff.userId, "moderation")) {
    return { status: "error", message: "Too many moderation changes. Please wait a moment." };
  }

  const parsed = moderationActionSchema.safeParse({
    userId: formText(formData, "userId"),
    action: formText(formData, "action"),
    reason: formText(formData, "reason"),
    reportId: optionalText(formData, "reportId"),
    targetType: optionalText(formData, "targetType"),
    targetId: optionalText(formData, "targetId"),
    evidenceRefs: formJson(formData, "evidenceRefs"),
    durationHours: formNumber(formData, "durationHours"),
  });
  if (!parsed.success) return invalid("Please check the moderation details.", parsed.error);

  try {
    await applyModerationAction(staff, parsed.data);
    revalidateAdmin([
      `/admin/users/${parsed.data.userId}`,
      ...(parsed.data.reportId ? [`/admin/reports/${parsed.data.reportId}`] : []),
    ]);
    return { status: "success", message: "Moderation action recorded." };
  } catch (error) {
    return failure("admin.moderation", error);
  }
}

/** Approving an appeal restores the linked action via the trusted service. */
export async function decideAppealAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let staff;
  try {
    staff = await requireStaff();
  } catch (error) {
    return failure("admin.appeal.staff", error);
  }
  if (rateLimited(staff.userId, "appeal-decision")) {
    return { status: "error", message: "Too many decisions. Please wait a moment." };
  }

  const appealId = formText(formData, "appealId");
  const parsed = appealDecisionSchema.safeParse({
    status: formText(formData, "status"),
    resolution: formText(formData, "resolution"),
  });
  if (!parsed.success) return invalid("Please check the appeal decision.", parsed.error);

  try {
    await decideAppeal(staff, appealId, parsed.data);
    revalidateAdmin();
    return { status: "success", message: "Appeal decision recorded." };
  } catch (error) {
    return failure("admin.appeal", error);
  }
}
