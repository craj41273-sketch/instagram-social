"use server";

import { revalidatePath } from "next/cache";
import type { ReportActionState } from "@/app/actions/reporting-types";
import { getActiveProfile, requireProfile } from "@/lib/auth/dal";
import { toSafeMessage } from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import { createAppeal, createReport } from "@/lib/reporting/service";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { appealSchema, createReportSchema } from "@/lib/validations/reporting";

function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function fieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const errors: Partial<Record<string, string>> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "form");
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}

/** Files a report with session-derived identity and a bounded snapshot. */
export async function createReportAction(
  _state: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const current = await getActiveProfile();
  if (!current) {
    return { status: "error", message: "Your account cannot perform this action." };
  }
  const userId = current.user.id;

  if (!consumeRateLimit(`report:create:${userId}`, 5, 10 * 60_000).allowed) {
    return {
      status: "error",
      message: "Too many reports. Please wait before submitting another.",
    };
  }

  const parsed = createReportSchema.safeParse({
    targetType: formText(formData, "targetType"),
    targetId: formText(formData, "targetId"),
    category: formText(formData, "category"),
    reason: formText(formData, "reason"),
    explanation: formText(formData, "explanation"),
    disclosureAccepted: formText(formData, "disclosureAccepted") === "true",
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Please check the report details.",
      errors: fieldErrors(parsed.error.issues),
    };
  }

  try {
    const result = await createReport(userId, parsed.data);
    revalidatePath("/report");
    revalidatePath("/appeals");
    revalidatePath("/admin/reports");
    return {
      status: "success",
      reportId: result.id,
      message: result.duplicate
        ? `This content was already reported. Reference: ${result.id}`
        : `Report submitted. Reference: ${result.id}`,
    };
  } catch (error) {
    logServerError("reporting.createReport", error, { userId });
    return { status: "error", message: toSafeMessage(error) };
  }
}

/** Submits an appeal for a report or moderation decision owned by the caller. */
export async function createAppealAction(
  _state: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const current = await requireProfile();
  const userId = current.user.id;

  if (!consumeRateLimit(`appeal:create:${userId}`, 3, 10 * 60_000).allowed) {
    return {
      status: "error",
      message: "Too many appeals. Please wait before submitting another.",
    };
  }

  const parsed = appealSchema.safeParse({
    moderationActionId: formText(formData, "moderationActionId") || undefined,
    reportId: formText(formData, "reportId") || undefined,
    reason: formText(formData, "reason"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Please check your appeal details.",
      errors: fieldErrors(parsed.error.issues),
    };
  }

  try {
    const result = await createAppeal(userId, parsed.data);
    revalidatePath("/appeals");
    revalidatePath("/admin/appeals");
    return {
      status: "success",
      message: result.duplicate
        ? "An appeal is already pending for that reference."
        : "Appeal submitted. A moderator will review it.",
    };
  } catch (error) {
    logServerError("reporting.createAppeal", error, { userId });
    return { status: "error", message: toSafeMessage(error) };
  }
}
