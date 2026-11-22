"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { signupAction } from "@/app/actions/auth";
import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthCheckbox } from "@/components/auth/auth-checkbox";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { SocialLoginButton } from "@/components/auth/social-login-button";
import { SubmitButton } from "@/components/auth/submit-button";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import {
  initialAuthState,
  type AuthActionState,
} from "@/lib/auth/action-state";
import {
  signupSchema,
  toFormErrors,
  type FormErrors,
  type SignupValues,
} from "@/lib/validations/auth";

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
  const [state, formAction, pending] = useActionState<
    AuthActionState<SignupValues>,
    FormData
  >(signupAction, initialAuthState<SignupValues>());

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

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

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
    formAction(new FormData(event.currentTarget));
  }

  const displayNameError = errors.displayName ?? state.errors?.displayName;
  const usernameError = errors.username ?? state.errors?.username;
  const emailError = errors.email ?? state.errors?.email;
  const passwordError = errors.password ?? state.errors?.password;
  const confirmError = errors.confirmPassword ?? state.errors?.confirmPassword;
  const termsError = errors.terms ?? state.errors?.terms;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormField
        id="displayName"
        label="Display name"
        hint="This is how your name appears on your profile."
        error={displayNameError}
      >
        <Input
          id="displayName"
          name="displayName"
          autoComplete="name"
          placeholder="Your name"
          value={values.displayName}
          onChange={(event) => update("displayName", event.target.value)}
          aria-invalid={Boolean(displayNameError) || undefined}
          aria-describedby={
            displayNameError ? "displayName-error" : "displayName-hint"
          }
          className="h-11"
          disabled={pending}
        />
      </FormField>

      <FormField
        id="username"
        label="Username"
        hint="3–20 characters: lowercase letters, numbers, dots, or underscores."
        error={usernameError}
      >
        <Input
          id="username"
          name="username"
          autoComplete="username"
          placeholder="your.handle"
          value={values.username}
          onChange={(event) => update("username", event.target.value)}
          aria-invalid={Boolean(usernameError) || undefined}
          aria-describedby={usernameError ? "username-error" : "username-hint"}
          className="h-11"
          disabled={pending}
        />
      </FormField>

      <FormField
        id="signup-email"
        label="Email"
        hint="Use an address you can access later."
        error={emailError}
      >
        <Input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={values.email}
          onChange={(event) => update("email", event.target.value)}
          aria-invalid={Boolean(emailError) || undefined}
          aria-describedby={emailError ? "signup-email-error" : "signup-email-hint"}
          className="h-11"
          disabled={pending}
        />
      </FormField>

      <FormField
        id="signup-password"
        label="Password"
        hint="At least 8 characters with a letter and a number."
        error={passwordError}
      >
        <PasswordInput
          id="signup-password"
          value={values.password}
          onChange={updatePassword}
          placeholder="Create a password"
          autoComplete="new-password"
          invalid={Boolean(passwordError)}
          describedBy={
            [
              passwordError ? "signup-password-error" : "signup-password-hint",
              "signup-password-strength",
            ].join(" ")
          }
          disabled={pending}
        />
        <div id="signup-password-strength">
          <PasswordStrength value={values.password} />
        </div>
      </FormField>

      <FormField
        id="confirmPassword"
        label="Confirm password"
        error={confirmError}
      >
        <PasswordInput
          id="confirmPassword"
          value={values.confirmPassword}
          onChange={updateConfirmPassword}
          placeholder="Repeat your password"
          autoComplete="new-password"
          invalid={Boolean(confirmError)}
          describedBy={confirmError ? "confirmPassword-error" : undefined}
          disabled={pending}
        />
      </FormField>

      <div>
        <AuthCheckbox
          id="terms"
          name="terms"
          checked={values.terms}
          onCheckedChange={(checked) => update("terms", checked)}
          invalid={Boolean(termsError)}
          describedBy={termsError ? "terms-error" : undefined}
          label={
            <>
              I agree to the{" "}
              <Link href="/terms">Terms</Link> and{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </>
          }
        />
        {termsError && (
          <p id="terms-error" role="alert" className="mt-2 text-xs text-destructive">
            {termsError}
          </p>
        )}
      </div>

      {state.status === "verification" && state.message && (
        <AuthAlert
          tone="success"
          title="Check your inbox"
          description={state.message}
        />
      )}
      {state.status === "needs-retry" && state.message && (
        <AuthAlert
          tone="warning"
          title="Profile setup incomplete"
          description={state.message}
        />
      )}
      {state.status === "error" && state.message && (
        <AuthAlert tone="error" title="Could not create account" description={state.message} />
      )}

      <SubmitButton
        label="Create account"
        loading={pending}
        loadingLabel="Creating your account…"
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
