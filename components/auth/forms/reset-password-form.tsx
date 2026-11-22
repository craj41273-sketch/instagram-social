"use client";

import * as React from "react";
import Link from "next/link";
import { AuthAlert } from "@/components/auth/auth-alert";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { SubmitButton } from "@/components/auth/submit-button";
import { FormField } from "@/components/shared/form-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { waitForPreviewState } from "@/lib/auth-preview";
import {
  resetPasswordSchema,
  toFormErrors,
  type FormErrors,
  type ResetPasswordValues,
} from "@/lib/validations/auth";

interface ResetPasswordFormProps {
  token?: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [values, setValues] = React.useState<ResetPasswordValues>({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = React.useState<FormErrors<ResetPasswordValues>>({});
  const [status, setStatus] = React.useState<"idle" | "loading" | "ready">(
    "idle",
  );

  function updatePassword(value: string) {
    setValues((current) => ({ ...current, password: value }));
    setErrors((current) => ({
      ...current,
      password: undefined,
      confirmPassword:
        current.confirmPassword && current.confirmPassword !== value
          ? "Passwords do not match."
          : undefined,
    }));
  }

  function updateConfirmPassword(value: string) {
    setValues((current) => ({ ...current, confirmPassword: value }));
    setErrors((current) => ({
      ...current,
      confirmPassword:
        value && value !== values.password ? "Passwords do not match." : undefined,
    }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") return;

    const result = resetPasswordSchema.safeParse(values);
    if (!result.success) {
      setErrors(toFormErrors<ResetPasswordValues>(result.error));
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      });
      return;
    }

    setErrors({});
    setStatus("loading");
    await waitForPreviewState();
    setStatus("ready");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {token ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-surface/60 p-3">
          <StatusBadge tone="success">Token detected</StatusBadge>
          <p className="text-xs text-muted-foreground">
            The token will be passed to Supabase Auth when this flow is wired up.
          </p>
        </div>
      ) : (
        <AuthAlert
          tone="warning"
          title="No reset token found"
          description="Open this page from a reset link once email delivery is connected. The form below is available for UI preview only."
        />
      )}

      <FormField
        id="reset-password"
        label="New password"
        hint="At least 8 characters with a letter and a number."
        error={errors.password}
      >
        <PasswordInput
          id="reset-password"
          value={values.password}
          onChange={updatePassword}
          placeholder="New password"
          autoComplete="new-password"
          invalid={Boolean(errors.password)}
          describedBy={
            [
              errors.password ? "reset-password-error" : "reset-password-hint",
              "reset-password-strength",
            ].join(" ")
          }
          disabled={status === "loading"}
        />
        <div id="reset-password-strength">
          <PasswordStrength value={values.password} />
        </div>
      </FormField>

      <FormField
        id="reset-confirm"
        label="Confirm new password"
        error={errors.confirmPassword}
      >
        <PasswordInput
          id="reset-confirm"
          value={values.confirmPassword}
          onChange={updateConfirmPassword}
          placeholder="Repeat new password"
          autoComplete="new-password"
          invalid={Boolean(errors.confirmPassword)}
          describedBy={
            errors.confirmPassword ? "reset-confirm-error" : undefined
          }
          disabled={status === "loading"}
        />
      </FormField>

      {status === "ready" && (
        <AuthAlert
          tone="info"
          title="New password validated locally"
          description="Nothing was changed. Supabase Auth will handle the real reset once backend integration arrives."
        />
      )}

      <SubmitButton
        label="Set new password"
        loading={status === "loading"}
        loadingLabel="Updating…"
      />

      <p className="text-center text-xs text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Return to login
        </Link>
      </p>
    </form>
  );
}
