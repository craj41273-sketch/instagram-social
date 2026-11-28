"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  removeRiskAssessmentAction,
  setRiskAssessmentAction,
} from "@/lib/static/actions";
import { initialActionState, type ActionState } from "@/lib/static/actions";
import { ActionFeedback } from "@/components/settings/action-feedback";
import { FormField } from "@/components/shared/form-field";
import { PremiumButton } from "@/components/ui/premium-button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

function SubmitButton({ label, pendingLabel, danger = false }: {
  label: string;
  pendingLabel: string;
  danger?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <PremiumButton
      type="submit"
      premiumVariant={danger ? "danger" : "soft"}
      disabled={pending}
      aria-busy={pending || undefined}
    >
      {pending ? <><Spinner className="size-4 text-current" label={pendingLabel} /> {pendingLabel}</> : label}
    </PremiumButton>
  );
}

/** Risk is admin-only and must never be inferred from report volume or trust. */
export function RiskForm({
  userId,
  score,
  evidenceRefs,
}: {
  userId: string;
  score: number | null;
  evidenceRefs: string[];
}) {
  const [setState, setAction] = useActionState<ActionState, FormData>(
    setRiskAssessmentAction,
    initialActionState(),
  );
  const [removeState, removeAction] = useActionState<ActionState, FormData>(
    removeRiskAssessmentAction,
    initialActionState(),
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Risk is recorded only by administrators. Trust comes from community hypes; report volume
        alone never changes either value.
      </p>
      <form action={setAction} className="space-y-4">
        <input type="hidden" name="userId" value={userId} />
        <ActionFeedback state={setState} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id={`risk-score-${userId}`}
            label="Risk score (0–100)"
            hint="An explicit human assessment, not an automated score."
            error={setState.errors?.score}
          >
            <Input
              id={`risk-score-${userId}`}
              name="score"
              type="number"
              min={0}
              max={100}
              step={1}
              defaultValue={score ?? ""}
              required
            />
          </FormField>
          <FormField
            id={`risk-reason-${userId}`}
            label="Reason"
            hint="Required. Up to 1000 characters."
            error={setState.errors?.reason}
          >
            <Textarea
              id={`risk-reason-${userId}`}
              name="reason"
              maxLength={1000}
              rows={2}
              required
            />
          </FormField>
        </div>
        <FormField
          id={`risk-evidence-${userId}`}
          label="Evidence references"
          hint="JSON array of up to 20 UUIDs. Use [] when there are none."
          error={setState.errors?.evidenceRefs}
        >
          <Textarea
            id={`risk-evidence-${userId}`}
            name="evidenceRefs"
            defaultValue={JSON.stringify(evidenceRefs)}
            rows={2}
            className="font-mono text-xs"
          />
        </FormField>
        <div className="flex justify-end">
          <SubmitButton label="Save assessment" pendingLabel="Saving" />
        </div>
      </form>

      {score !== null ? (
        <form
          action={removeAction}
          onSubmit={(event) => {
            if (!window.confirm("Remove this risk assessment? This is recorded in the audit log.")) {
              event.preventDefault();
            }
          }}
          className="space-y-4 rounded-xl border border-destructive/20 bg-destructive/[0.04] p-4"
        >
          <input type="hidden" name="userId" value={userId} />
          <ActionFeedback state={removeState} />
          <FormField
            id={`risk-remove-reason-${userId}`}
            label="Reason for removal"
            error={removeState.errors?.reason}
          >
            <Textarea
              id={`risk-remove-reason-${userId}`}
              name="reason"
              maxLength={1000}
              rows={2}
              required
            />
          </FormField>
          <div className="flex justify-end">
            <SubmitButton label="Remove assessment" pendingLabel="Removing" danger />
          </div>
        </form>
      ) : null}
    </div>
  );
}
