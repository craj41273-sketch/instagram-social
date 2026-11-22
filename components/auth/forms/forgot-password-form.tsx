"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "@/app/actions/auth";
import { AuthAlert } from "@/components/auth/auth-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import {
  initialAuthState,
  type AuthActionState,
} from "@/lib/auth/action-state";
import {
  forgotPasswordSchema,
  toFormErrors,
  type ForgotPasswordValues,
  type FormErrors,
} from "@/lib/validations/auth";

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [errors, setErrors] = React.useState<FormErrors<ForgotPasswordValues>>({});
  const [state, formAction, pending] = useActionState<
    AuthActionState<ForgotPasswordValues>,
    FormData
  >(forgotPasswordAction, initialAuthState<ForgotPasswordValues>());

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setErrors(toFormErrors<ForgotPasswordValues>(result.error));
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      });
      return;
    }

    setErrors({});
    formAction(new FormData(event.currentTarget));
  }

  const emailError = errors.email ?? state.errors?.email;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormField
        id="forgot-email"
        label="Email"
        hint="We will send a secure recovery link to this address."
        error={emailError}
      >
        <Input
          id="forgot-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setErrors({});
          }}
          aria-invalid={Boolean(emailError) || undefined}
          aria-describedby={emailError ? "forgot-email-error" : "forgot-email-hint"}
          className="h-11"
          disabled={pending}
        />
      </FormField>

      {state.status === "success" && state.message && (
        <AuthAlert tone="success" title="Check your inbox" description={state.message} />
      )}
      {state.status === "error" && state.message && (
        <AuthAlert tone="error" title="Could not send recovery link" description={state.message} />
      )}

      <SubmitButton
        label="Continue"
        loading={pending}
        loadingLabel="Sending recovery link…"
      />

      <p className="text-center text-xs text-muted-foreground">
        Remembered it?{" "}
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
