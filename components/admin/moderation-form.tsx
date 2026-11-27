"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { applyModerationActionAction } from "@/app/actions/admin";
import { initialActionState, type ActionState } from "@/app/actions/settings-types";
import { ActionFeedback } from "@/components/settings/action-feedback";
import { FormField } from "@/components/shared/form-field";
import { PremiumButton } from "@/components/ui/premium-button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { MODERATION_ACTIONS } from "@/lib/validations/admin";

const HIGH_IMPACT = new Set(["ban", "suspend"]);

function humanize(value: string): string {
  return value.replace(/_/g, " ");
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <PremiumButton type="submit" premiumVariant="soft" disabled={pending} aria-busy={pending || undefined}>
      {pending ? <><Spinner className="size-4 text-current" label="Recording action" /> Recording…</> : "Record action"}
    </PremiumButton>
  );
}

/** Manual review only: no report count or score can trigger an action here. */
export function ModerationForm({
  defaultUserId = "",
  defaultReportId,
  defaultTargetType,
  defaultTargetId,
}: {
  defaultUserId?: string;
  defaultReportId?: string;
  defaultTargetType?: string;
  defaultTargetId?: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    applyModerationActionAction,
    initialActionState(),
  );
  const [action, setAction] = useState("warning");

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (HIGH_IMPACT.has(action)) {
          const approved = window.confirm(
            `Apply ${humanize(action)} to this account? This changes account status and is written to the audit log.`,
          );
          if (!approved) event.preventDefault();
        }
      }}
      className="space-y-4"
    >
      <ActionFeedback state={state} />
      <p className="text-sm text-muted-foreground">
        Actions are recorded only when you submit. Nothing is auto-deleted or auto-punished;
        removing content records a decision only.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="moderation-user"
          label="Account ID"
          hint={defaultUserId ? "Pre-filled from this report or profile." : "Enter the account ID to review."}
          error={state.errors?.userId}
        >
          <Input
            id="moderation-user"
            name="userId"
            defaultValue={defaultUserId}
            placeholder="Account UUID"
            required
          />
        </FormField>
        <FormField id="moderation-action" label="Action" error={state.errors?.action}>
          <select
            id="moderation-action"
            name="action"
            value={action}
            onChange={(event) => setAction(event.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {MODERATION_ACTIONS.map((option) => (
              <option key={option} value={option}>{humanize(option)}</option>
            ))}
          </select>
        </FormField>
      </div>
      {!defaultUserId ? (
        <p className="text-xs text-muted-foreground">
          Non-user reports do not resolve to an account automatically. Enter the account ID before
          recording an action.
        </p>
      ) : null}
      <FormField id="moderation-reason" label="Reason" hint="Required. Up to 1000 characters." error={state.errors?.reason}>
        <Textarea id="moderation-reason" name="reason" maxLength={1000} rows={2} required />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="moderation-report" label="Report ID" hint="Optional" error={state.errors?.reportId}>
          <Input
            id="moderation-report"
            name="reportId"
            defaultValue={defaultReportId ?? ""}
            placeholder="Report UUID"
          />
        </FormField>
        <FormField id="moderation-target" label="Content ID" hint="Optional" error={state.errors?.targetId}>
          <Input
            id="moderation-target"
            name="targetId"
            defaultValue={defaultTargetId ?? ""}
            placeholder="Post, comment, story, or message ID"
          />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="moderation-target-type" label="Content type" hint="Optional" error={state.errors?.targetType}>
          <Input
            id="moderation-target-type"
            name="targetType"
            defaultValue={defaultTargetType ?? ""}
            placeholder="post, comment, story, message…"
          />
        </FormField>
        {action === "suspend" ? (
          <FormField
            id="moderation-duration"
            label="Duration in hours"
            hint="Optional; leave blank for an indefinite suspension."
            error={state.errors?.durationHours}
          >
            <Input id="moderation-duration" name="durationHours" type="number" min={1} max={8760} step={1} />
          </FormField>
        ) : null}
      </div>
      <FormField
        id="moderation-evidence"
        label="Evidence references"
        hint="JSON array of up to 20 UUIDs. Use [] when there are none."
        error={state.errors?.evidenceRefs}
      >
        <Textarea
          id="moderation-evidence"
          name="evidenceRefs"
          defaultValue="[]"
          rows={2}
          className="font-mono text-xs"
        />
      </FormField>
      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
