"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  initialReportActionState,
  type ReportActionState,
} from "@/app/actions/reporting-types";
import { createAppealAction } from "@/app/actions/reporting";
import { FormField } from "@/components/shared/form-field";
import { PremiumButton } from "@/components/ui/premium-button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50";

interface AppealFormProps {
  moderationActionId?: string;
  reportId?: string;
  reports?: Array<{ id: string; status: string }>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <PremiumButton type="submit" disabled={pending} aria-busy={pending || undefined}>
      {pending ? (
        <>
          <Spinner className="size-4 text-current" label="Submitting appeal" />
          Submitting…
        </>
      ) : (
        "Submit appeal"
      )}
    </PremiumButton>
  );
}

/** Appeal intake; the reference is always owned by the signed-in user. */
export function AppealForm({ moderationActionId, reportId, reports }: AppealFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const reasonId = useId();
  const reportSelectId = useId();
  const handled = useRef<ReportActionState | null>(null);
  const [state, action] = useActionState(createAppealAction, initialReportActionState());
  const hasReports = (reports?.length ?? 0) > 0;
  const hasReference = Boolean(moderationActionId || reportId || hasReports);

  useEffect(() => {
    if (state.status !== "success" || handled.current === state) return;
    handled.current = state;
    toast({ title: "Appeal submitted", tone: "success" });
    router.refresh();
  }, [state, router, toast]);

  if (!hasReference) {
    return (
      <p className="text-sm text-muted-foreground">
        Appeals need a report or moderation decision reference. Use the link in a
        moderation notice, or submit a report first.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-5">
      {moderationActionId ? (
        <input type="hidden" name="moderationActionId" value={moderationActionId} />
      ) : null}
      {!moderationActionId && reportId && !hasReports ? (
        <input type="hidden" name="reportId" value={reportId} />
      ) : null}
      {!moderationActionId && hasReports ? (
        <FormField
          id={reportSelectId}
          label="Report to appeal"
          error={state.errors?.reportId}
          hint="Only reports you filed or reports about your account are listed."
        >
          <select
            id={reportSelectId}
            name="reportId"
            required
            defaultValue={reportId ?? ""}
            className={selectClass}
          >
            <option value="" disabled>
              Select a report
            </option>
            {reports?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id.slice(0, 8)}… · {item.status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </FormField>
      ) : null}

      <FormField
        id={reasonId}
        label="What are you appealing, and why?"
        error={state.errors?.reason}
        hint="10–2000 characters. Write your own explanation; do not paste private conversations."
      >
        <Textarea
          id={reasonId}
          name="reason"
          minLength={10}
          maxLength={2000}
          rows={5}
          required
          placeholder="Explain which decision you disagree with and why."
        />
      </FormField>

      {state.status === "error" && state.message ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
      {state.status === "success" && state.message ? (
        <p role="status" className="text-sm text-success">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
