"use client";

import * as React from "react";
import Link from "next/link";
import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthCheckbox } from "@/components/auth/auth-checkbox";
import { PasswordInput } from "@/components/auth/password-input";
import { SocialLoginButton } from "@/components/auth/social-login-button";
import { SubmitButton } from "@/components/auth/submit-button";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { waitForPreviewState } from "@/lib/auth-preview";
import {
  loginSchema,
  toFormErrors,
  type FormErrors,
  type LoginValues,
} from "@/lib/validations/auth";

type Status = "idle" | "loading" | "ready";

export function LoginForm() {
  const [values, setValues] = React.useState<LoginValues>({
    email: "",
    password: "",
    remember: false,
  });
  const [errors, setErrors] = React.useState<FormErrors<LoginValues>>({});
  const [status, setStatus] = React.useState<Status>("idle");

  function update<K extends keyof LoginValues>(key: K, value: LoginValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") return;

    const result = loginSchema.safeParse(values);
    if (!result.success) {
      setErrors(toFormErrors<LoginValues>(result.error));
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
      <FormField id="login-email" label="Email" error={errors.email}>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={values.email}
          onChange={(event) => update("email", event.target.value)}
          aria-invalid={Boolean(errors.email) || undefined}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          className="h-11"
          disabled={status === "loading"}
        />
      </FormField>

      <FormField
        id="login-password"
        label="Password"
        error={errors.password}
        hint={
          <span className="flex items-center justify-between gap-3">
            <span>Enter your password.</span>
            <Link
              href="/forgot-password"
              className="shrink-0 font-medium text-primary underline-offset-2 hover:underline"
            >
              Forgot password?
            </Link>
          </span>
        }
      >
        <PasswordInput
          id="login-password"
          value={values.password}
          onChange={(value) => update("password", value)}
          placeholder="Your password"
          autoComplete="current-password"
          invalid={Boolean(errors.password)}
          describedBy={
            errors.password ? "login-password-error" : "login-password-hint"
          }
          disabled={status === "loading"}
        />
      </FormField>

      <AuthCheckbox
        id="remember"
        checked={values.remember}
        onCheckedChange={(checked) => update("remember", checked)}
        label="Keep me signed in on this device"
      />

      {status === "ready" && (
        <AuthAlert
          tone="warning"
          title="Sign-in is not connected yet"
          description="Your details passed local validation. No account was checked and no session was created."
        />
      )}

      <SubmitButton
        label="Log in"
        loading={status === "loading"}
        loadingLabel="Signing in…"
      />

      <p className="text-center text-xs text-muted-foreground">
        New to Luma?{" "}
        <Link
          href="/signup"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Create an account
        </Link>
      </p>

      <SocialLoginButton />
    </form>
  );
}
