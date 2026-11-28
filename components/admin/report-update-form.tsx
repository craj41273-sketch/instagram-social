"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateReportAction } from "@/lib/static/actions";
import { initialActionState, type ActionState } from "@/lib/static/actions";
import { AdminStatusBadge, PriorityBadge } from "@/components/admin/admin-badges";
import { ActionFeedback } from "@/components/settings/action-feedback";
import { FormField } from "@/components/shared/form-field";
import { PremiumButton } from "@/components/ui/premium-button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { REPORT_PRIORITIES, REPORT_STATUSES } from "@/lib/validations/reporting";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <PremiumButton type="submit" premiumVariant="soft" disabled={pending} aria-busy={pending || undefined}>
      {pending ? <><Spinner className="size-4 text-current" label="Saving report" /> Saving…</> : "Save report"}
    </PremiumButton>
  );
}

/** Workflow controls only; the report ID is a reference, never an authority. */
export function ReportUpdateForm({
  reportId,
  status,
  priority,
  assigneeId,
  resolutionNotes,
}: {
  reportId: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  resolutionNotes: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateReportAction,
    initialActionState(),
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="reportId" value={reportId} />
      <ActionFeedback state={state} />
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Current:</span>
        <AdminStatusBadge status={status} />
        <PriorityBadge priority={priority} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={`report-status-${reportId}`} label="Status" error={state.errors?.status}>
          <select
            id={`report-status-${reportId}`}
            name="status"
            defaultValue={status}
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {REPORT_STATUSES.map((option) => (
              <option key={option} value={option}>{option.replace(/_/g, " ")}</option>
            ))}
          </select>
        </FormField>
        <FormField id={`report-priority-${reportId}`} label="Priority" error={state.errors?.priority}>
          <select
            id={`report-priority-${reportId}`}
            name="priority"
            defaultValue={priority}
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {REPORT_PRIORITIES.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </FormField>
      </div>
      <FormField
        id={`report-assignee-${reportId}`}
        label="Assignee account ID"
        hint="Optional. Must be an existing account ID."
        error={state.errors?.assigneeId}
      >
        <Input
          id={`report-assignee-${reportId}`}
          name="assigneeId"
          defaultValue={assigneeId ?? ""}
          placeholder="Optional account ID"
        />
      </FormField>
      <FormField
        id={`report-resolution-${reportId}`}
        label="Resolution notes"
        hint="Staff notes only; at most 2000 characters."
        error={state.errors?.resolutionNotes}
      >
        <Textarea
          id={`report-resolution-${reportId}`}
          name="resolutionNotes"
          defaultValue={resolutionNotes}
          maxLength={2000}
          rows={3}
        />
      </FormField>
      <div className="flex justify-end">
        <SaveButton />
      </div>
    </form>
  );
}
