"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/lib/static/actions";
import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthCheckbox } from "@/components/auth/auth-checkbox";
import { PasswordInput } from "@/components/auth/password-input";
import { SocialLoginButton } from "@/components/auth/social-login-button";
import { SubmitButton } from "@/components/auth/submit-button";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import {
  initialAuthState,
  type AuthActionState,
} from "@/lib/auth/action-state";
import {
  loginSchema,
  toFormErrors,
  type FormErrors,
  type LoginValues,
} from "@/lib/validations/auth";

interface LoginFormProps {
  notice?: "reset" | "setup" | null;
}

export function LoginForm({ notice }: LoginFormProps) {
  const [values, setValues] = React.useState<LoginValues>({
    email: "",
    password: "",
    remember: false,
  });
  const [errors, setErrors] = React.useState<FormErrors<LoginValues>>({});
  const [state, formAction, pending] = useActionState<
    AuthActionState<LoginValues>,
    FormData
  >(loginAction, initialAuthState<LoginValues>());

  function update<K extends keyof LoginValues>(key: K, value: LoginValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const result = loginSchema.safeParse(values);
    if (!result.success) {
      setErrors(toFormErrors<LoginValues>(result.error));
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      });
      return;
    }

    setErrors({});
    formAction(new FormData(event.currentTarget));
  }

  const emailError = errors.email ?? state.errors?.email;
  const passwordError = errors.password ?? state.errors?.password;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {notice === "reset" && (
        <AuthAlert
          tone="success"
          title="Password updated"
          description="Log in with your new password to continue."
        />
      )}
      {notice === "setup" && (
        <AuthAlert
          tone="warning"
          title="Profile setup needs a retry"
          description="Log in again and we will finish setting up your profile from your verified account."
        />
      )}

      <FormField id="login-email" label="Email" error={emailError}>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={values.email}
          onChange={(event) => update("email", event.target.value)}
          aria-invalid={Boolean(emailError) || undefined}
          aria-describedby={emailError ? "login-email-error" : undefined}
          className="h-11"
          disabled={pending}
        />
      </FormField>

      <FormField
        id="login-password"
        label="Password"
        error={passwordError}
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
          invalid={Boolean(passwordError)}
          describedBy={
            passwordError ? "login-password-error" : "login-password-hint"
          }
          disabled={pending}
        />
      </FormField>

      <AuthCheckbox
        id="remember"
        name="remember"
        checked={values.remember}
        onCheckedChange={(checked) => update("remember", checked)}
        label="Keep me signed in on this device"
      />

      {state.status === "error" && state.message && (
        <AuthAlert tone="error" title="Sign-in failed" description={state.message} />
      )}
      {state.status === "needs-retry" && state.message && (
        <AuthAlert tone="warning" title="Almost there" description={state.message} />
      )}

      <SubmitButton
        label="Log in"
        loading={pending}
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
