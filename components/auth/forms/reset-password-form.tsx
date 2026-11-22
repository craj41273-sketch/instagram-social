"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction } from "@/app/actions/auth";
import { AuthAlert } from "@/components/auth/auth-alert";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { SubmitButton } from "@/components/auth/submit-button";
import { FormField } from "@/components/shared/form-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { createSupabaseBrowserClient } from "@/lib/auth/client";
import {
  initialAuthState,
  type AuthActionState,
} from "@/lib/auth/action-state";
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
  const [state, formAction, pending] = useActionState<
    AuthActionState<ResetPasswordValues>,
    FormData
  >(resetPasswordAction, initialAuthState<ResetPasswordValues>());

  // A Supabase recovery link puts its tokens in the URL fragment. Creating
  // the browser client lets @supabase/ssr exchange them and write cookies
  // before the server action reads the session.
  React.useEffect(() => {
    try {
      void createSupabaseBrowserClient().auth.getSession();
    } catch {
      // The server action reports the configuration problem to the user.
    }
  }, []);

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

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const result = resetPasswordSchema.safeParse(values);
    if (!result.success) {
      setErrors(toFormErrors<ResetPasswordValues>(result.error));
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      });
      return;
    }

    setErrors({});
    formAction(new FormData(event.currentTarget));
  }

  const passwordError = errors.password ?? state.errors?.password;
  const confirmError = errors.confirmPassword ?? state.errors?.confirmPassword;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <input type="hidden" name="token" value={token ?? ""} />

      {token ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-surface/60 p-3">
          <StatusBadge tone="success">Recovery token detected</StatusBadge>
          <p className="text-xs text-muted-foreground">
            It will be exchanged securely with Supabase Auth when you continue.
          </p>
        </div>
      ) : (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Open this page from the recovery link in your email. Reset links from
          Supabase include a secure one-time token.
        </p>
      )}

      <FormField
        id="reset-password"
        label="New password"
        hint="At least 8 characters with a letter and a number."
        error={passwordError}
      >
        <PasswordInput
          id="reset-password"
          value={values.password}
          onChange={updatePassword}
          placeholder="New password"
          autoComplete="new-password"
          invalid={Boolean(passwordError)}
          describedBy={
            [
              passwordError ? "reset-password-error" : "reset-password-hint",
              "reset-password-strength",
            ].join(" ")
          }
          disabled={pending}
        />
        <div id="reset-password-strength">
          <PasswordStrength value={values.password} />
        </div>
      </FormField>

      <FormField
        id="reset-confirm"
        label="Confirm new password"
        error={confirmError}
      >
        <PasswordInput
          id="reset-confirm"
          value={values.confirmPassword}
          onChange={updateConfirmPassword}
          placeholder="Repeat new password"
          autoComplete="new-password"
          invalid={Boolean(confirmError)}
          describedBy={confirmError ? "reset-confirm-error" : undefined}
          disabled={pending}
        />
      </FormField>

      {state.status === "error" && state.message && (
        <AuthAlert tone="error" title="Could not update password" description={state.message} />
      )}

      <SubmitButton
        label="Set new password"
        loading={pending}
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
