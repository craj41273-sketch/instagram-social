"use client";

import * as React from "react";
import Link from "next/link";
import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthCheckbox } from "@/components/auth/auth-checkbox";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { SocialLoginButton } from "@/components/auth/social-login-button";
import { SubmitButton } from "@/components/auth/submit-button";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { waitForPreviewState } from "@/lib/auth-preview";
import {
  signupSchema,
  toFormErrors,
  type FormErrors,
  type SignupValues,
} from "@/lib/validations/auth";

type Status = "idle" | "loading" | "ready";

const initialValues: SignupValues = {
  displayName: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  terms: false,
};

export function SignupForm() {
  const [values, setValues] = React.useState<SignupValues>(initialValues);
  const [errors, setErrors] = React.useState<FormErrors<SignupValues>>({});
  const [status, setStatus] = React.useState<Status>("idle");

  function update<K extends keyof SignupValues>(
    key: K,
    value: SignupValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

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

    const result = signupSchema.safeParse(values);
    if (!result.success) {
      const nextErrors = toFormErrors<SignupValues>(result.error);
      setErrors(nextErrors);
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>("[aria-invalid='true']")
          ?.focus();
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
        id="displayName"
        label="Display name"
        hint="This is how your name appears on your profile."
        error={errors.displayName}
      >
        <Input
          id="displayName"
          name="displayName"
          autoComplete="name"
          placeholder="Your name"
          value={values.displayName}
          onChange={(event) => update("displayName", event.target.value)}
          aria-invalid={Boolean(errors.displayName) || undefined}
          aria-describedby={
            errors.displayName ? "displayName-error" : "displayName-hint"
          }
          className="h-11"
          disabled={status === "loading"}
        />
      </FormField>

      <FormField
        id="username"
        label="Username"
        hint="3–20 characters: lowercase letters, numbers, dots, or underscores."
        error={errors.username}
      >
        <Input
          id="username"
          name="username"
          autoComplete="username"
          placeholder="your.handle"
          value={values.username}
          onChange={(event) => update("username", event.target.value)}
          aria-invalid={Boolean(errors.username) || undefined}
          aria-describedby={errors.username ? "username-error" : "username-hint"}
          className="h-11"
          disabled={status === "loading"}
        />
      </FormField>

      <FormField
        id="signup-email"
        label="Email"
        hint="Use an address you can access later."
        error={errors.email}
      >
        <Input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={values.email}
          onChange={(event) => update("email", event.target.value)}
          aria-invalid={Boolean(errors.email) || undefined}
          aria-describedby={errors.email ? "signup-email-error" : "signup-email-hint"}
          className="h-11"
          disabled={status === "loading"}
        />
      </FormField>

      <FormField
        id="signup-password"
        label="Password"
        hint="At least 8 characters with a letter and a number."
        error={errors.password}
      >
        <PasswordInput
          id="signup-password"
          value={values.password}
          onChange={updatePassword}
          placeholder="Create a password"
          autoComplete="new-password"
          invalid={Boolean(errors.password)}
          describedBy={
            [
              errors.password ? "signup-password-error" : "signup-password-hint",
              "signup-password-strength",
            ].join(" ")
          }
          disabled={status === "loading"}
        />
        <div id="signup-password-strength">
          <PasswordStrength value={values.password} />
        </div>
      </FormField>

      <FormField
        id="confirmPassword"
        label="Confirm password"
        error={errors.confirmPassword}
      >
        <PasswordInput
          id="confirmPassword"
          value={values.confirmPassword}
          onChange={updateConfirmPassword}
          placeholder="Repeat your password"
          autoComplete="new-password"
          invalid={Boolean(errors.confirmPassword)}
          describedBy={
            errors.confirmPassword ? "confirmPassword-error" : undefined
          }
          disabled={status === "loading"}
        />
      </FormField>

      <div>
        <AuthCheckbox
          id="terms"
          checked={values.terms}
          onCheckedChange={(checked) => update("terms", checked)}
          invalid={Boolean(errors.terms)}
          describedBy={errors.terms ? "terms-error" : undefined}
          label={
            <>
              I agree to the{" "}
              <Link href="/terms">Terms</Link> and{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </>
          }
        />
        {errors.terms && (
          <p id="terms-error" role="alert" className="mt-2 text-xs text-destructive">
            {errors.terms}
          </p>
        )}
      </div>

      {status === "ready" && (
        <AuthAlert
          tone="info"
          title="Details validated locally"
          description="No account was created. Registration will call Supabase Auth once the backend block is implemented."
        />
      )}

      <SubmitButton
        label="Create account"
        loading={status === "loading"}
        loadingLabel="Checking your details…"
      />

      <p className="text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Log in
        </Link>
      </p>

      <SocialLoginButton />
    </form>
  );
}
