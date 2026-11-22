"use client";

import * as React from "react";
import Link from "next/link";
import { AuthAlert } from "@/components/auth/auth-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { waitForPreviewState } from "@/lib/auth-preview";
import {
  forgotPasswordSchema,
  toFormErrors,
  type ForgotPasswordValues,
  type FormErrors,
} from "@/lib/validations/auth";

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [errors, setErrors] = React.useState<FormErrors<ForgotPasswordValues>>({});
  const [status, setStatus] = React.useState<"idle" | "loading" | "ready">(
    "idle",
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") return;

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setErrors(toFormErrors<ForgotPasswordValues>(result.error));
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
      <FormField
        id="forgot-email"
        label="Email"
        hint="We will use this address when email delivery is connected."
        error={errors.email}
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
          aria-invalid={Boolean(errors.email) || undefined}
          aria-describedby={errors.email ? "forgot-email-error" : "forgot-email-hint"}
          className="h-11"
          disabled={status === "loading"}
        />
      </FormField>

      {status === "ready" && (
        <AuthAlert
          tone="warning"
          title="Recovery is not connected yet"
          description="Your address passed local validation. No email was sent and no password was changed."
        />
      )}

      <SubmitButton
        label="Continue"
        loading={status === "loading"}
        loadingLabel="Checking…"
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
