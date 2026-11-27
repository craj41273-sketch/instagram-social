import type { ActionState } from "@/app/actions/settings-types";

/** Action state that can carry the server-generated report reference. */
export interface ReportActionState extends ActionState {
  reportId?: string;
}

export function initialReportActionState(): ReportActionState {
  return { status: "idle" };
}
