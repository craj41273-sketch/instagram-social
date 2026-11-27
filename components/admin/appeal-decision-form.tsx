"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { decideAppealAction } from "@/app/actions/admin";
import { initialActionState, type ActionState } from "@/app/actions/settings-types";
import { ActionFeedback } from "@/components/settings/action-feedback";
import { FormField } from "@/components/shared/form-field";
import { PremiumButton } from "@/components/ui/premium-button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <PremiumButton type="submit" premiumVariant="soft" disabled={pending} aria-busy={pending || undefined}>
      {pending ? <><Spinner className="size-4 text-current" label="Recording decision" /> Recording…</> : "Record decision"}
    </PremiumButton>
  );
}

/** Both decisions are high impact, so each requires an explicit confirmation. */
export function AppealDecisionForm({ appealId }: { appealId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    decideAppealAction,
    initialActionState(),
  );
  const [status, setStatus] = useState("");

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (status !== "approved" && status !== "rejected") return;
        if (!window.confirm(`${status === "approved" ? "Approve" : "Reject"} this appeal? The decision is recorded in the audit log.`)) {
          event.preventDefault();
        }
      }}
      className="space-y-3"
    >
      <input type="hidden" name="appealId" value={appealId} />
      <ActionFeedback state={state} />
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr] sm:items-start">
        <FormField id={`appeal-status-${appealId}`} label="Decision" error={state.errors?.status}>
          <select
            id={`appeal-status-${appealId}`}
            name="status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            required
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Choose…</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </FormField>
        <FormField
          id={`appeal-resolution-${appealId}`}
          label="Resolution"
          hint="Plain text only; up to 2000 characters."
          error={state.errors?.resolution}
        >
          <Textarea
            id={`appeal-resolution-${appealId}`}
            name="resolution"
            maxLength={2000}
            rows={2}
            required
          />
        </FormField>
      </div>
      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
