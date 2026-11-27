"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  initialReportActionState,
  type ReportActionState,
} from "@/app/actions/reporting-types";
import { createReportAction } from "@/app/actions/reporting";
import { FormField } from "@/components/shared/form-field";
import { PremiumButton } from "@/components/ui/premium-button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  REPORT_CATEGORIES,
  REPORT_REASONS,
  REPORT_TARGET_TYPES,
} from "@/lib/validations/reporting";

type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50";

type Category = (typeof REPORT_CATEGORIES)[number];

interface ReportFormProps {
  targetType: ReportTargetType;
  targetId: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <PremiumButton type="submit" disabled={pending} aria-busy={pending || undefined}>
      {pending ? (
        <>
          <Spinner className="size-4 text-current" label="Submitting report" />
          Submitting…
        </>
      ) : (
        "Submit report"
      )}
    </PremiumButton>
  );
}

/** Report intake with a required disclosure and no client-side identity. */
export function ReportForm({ targetType, targetId }: ReportFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const categoryId = useId();
  const reasonId = useId();
  const explanationId = useId();
  const disclosureId = useId();
  const handled = useRef<ReportActionState | null>(null);
  const [state, action] = useActionState(createReportAction, initialReportActionState());
  const [category, setCategory] = useState<Category>(REPORT_CATEGORIES[0] ?? "other");
  const [reason, setReason] = useState(
    REPORT_REASONS[REPORT_CATEGORIES[0] ?? "other"]?.[0] ?? "",
  );
  const [explanation, setExplanation] = useState("");

  useEffect(() => {
    if (state.status !== "success" || !state.reportId || handled.current === state) return;
    handled.current = state;
    toast({ title: "Report submitted", tone: "success" });
    router.push(`/report/${state.reportId}`);
  }, [state, router, toast]);

  const reasons = REPORT_REASONS[category] ?? [];

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />

      <FormField
        id={categoryId}
        label="Category"
        error={state.errors?.category}
        hint="Choose the closest match; severe categories are escalated automatically."
      >
        <select
          id={categoryId}
          name="category"
          value={category}
          className={selectClass}
          onChange={(event) => {
            const next = event.target.value as Category;
            setCategory(next);
            setReason(REPORT_REASONS[next]?.[0] ?? "");
          }}
        >
          {REPORT_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </FormField>

      <FormField id={reasonId} label="Reason" error={state.errors?.reason}>
        <select
          id={reasonId}
          name="reason"
          value={reason}
          className={selectClass}
          onChange={(event) => setReason(event.target.value)}
        >
          {reasons.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        id={explanationId}
        label="What happened? (optional)"
        error={state.errors?.explanation}
        hint={`${explanation.length}/2000 characters. Use your own words.`}
      >
        <Textarea
          id={explanationId}
          name="explanation"
          value={explanation}
          onChange={(event) => setExplanation(event.target.value)}
          maxLength={2000}
          rows={5}
          placeholder="Describe the content or behaviour in your own words."
        />
      </FormField>

      <div className="space-y-2 rounded-xl border border-border/70 bg-surface/50 p-4">
        <label htmlFor={disclosureId} className="flex items-start gap-3 text-sm leading-relaxed">
          <input
            id={disclosureId}
            type="checkbox"
            name="disclosureAccepted"
            value="true"
            required
            className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
          />
          <span>
            I understand that my identity is hidden from the person I report and that
            authorised staff can review the report.
          </span>
        </label>
        {state.errors?.disclosureAccepted ? (
          <p role="alert" className="pl-7 text-xs text-destructive">
            {state.errors.disclosureAccepted}
          </p>
        ) : null}
      </div>

      {state.status === "error" && state.message ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
