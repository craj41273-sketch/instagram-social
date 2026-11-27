"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { addEvidenceNoteAction } from "@/app/actions/admin";
import { initialActionState, type ActionState } from "@/app/actions/settings-types";
import { ActionFeedback } from "@/components/settings/action-feedback";
import { FormField } from "@/components/shared/form-field";
import { PremiumButton } from "@/components/ui/premium-button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <PremiumButton type="submit" premiumVariant="soft" disabled={pending} aria-busy={pending || undefined}>
      {pending ? <><Spinner className="size-4 text-current" label="Adding note" /> Adding…</> : "Add note"}
    </PremiumButton>
  );
}

/** Notes are staff-only annotations, never private message text. */
export function EvidenceNoteForm({ reportId }: { reportId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    addEvidenceNoteAction,
    initialActionState(),
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="reportId" value={reportId} />
      <ActionFeedback state={state} />
      <FormField
        id={`evidence-note-${reportId}`}
        label="Evidence note"
        hint="What was reviewed and why. Up to 1000 characters."
        error={state.errors?.note}
      >
        <Textarea
          key={`${reportId}-${state.status}`}
          id={`evidence-note-${reportId}`}
          name="note"
          maxLength={1000}
          rows={3}
          required
          placeholder="Summarize the check you performed."
        />
      </FormField>
      <div className="flex justify-end">
        <SaveButton />
      </div>
    </form>
  );
}
