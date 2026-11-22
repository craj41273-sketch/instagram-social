"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import {
  resendVerificationAction,
  retryProfileSetupFormAction,
} from "@/app/actions/auth";
import { AuthAlert } from "@/components/auth/auth-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { FormField } from "@/components/shared/form-field";
import { PremiumButton } from "@/components/ui/premium-button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  initialAuthState,
  type AuthActionState,
} from "@/lib/auth/action-state";
import { emailSchema } from "@/lib/validations/auth";

interface VerifyEmailFormProps {
  token?: string;
}

/** Shows real verification/resend states without ever simulating success. */
export function VerifyEmailForm({ token }: VerifyEmailFormProps) {
  const [email, setEmail] = React.useState("");
  const [emailError, setEmailError] = React.useState<string | undefined>();
  const [resendState, resendAction, resendPending] = useActionState<
    AuthActionState,
    FormData
  >(resendVerificationAction, initialAuthState());
  const [retryState, retryAction, retryPending] = useActionState<
    AuthActionState,
    FormData
  >(retryProfileSetupFormAction, initialAuthState());

  function onResend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (resendPending) return;
    if (email && !emailSchema.safeParse(email).success) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError(undefined);
    resendAction(new FormData(event.currentTarget));
  }

  function onRetry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (retryPending) return;
    retryAction(new FormData());
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={token ? "success" : "warning"}>
          {token ? "Link detected" : "Verification required"}
        </StatusBadge>
        <span className="text-xs text-muted-foreground">
          Verification is handled by Supabase Auth — nothing is simulated here.
        </span>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-surface/60 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Mail className="size-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-medium">Check your inbox</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Open the verification link we sent to your address. It confirms your
            email with Supabase and creates your session.
          </p>
        </div>
      </div>

      {token ? (
        <PremiumButton asChild premiumVariant="outline" size="lg" className="w-full">
          <Link
            href={`/auth/confirm?token_hash=${encodeURIComponent(token)}&type=email`}
          >
            Confirm this email address
          </Link>
        </PremiumButton>
      ) : (
        <p className="text-xs text-muted-foreground">
          No verification token was found in the URL. Use the form below to send
          a fresh link.
        </p>
      )}

      <form onSubmit={onResend} noValidate className="space-y-4">
        <FormField
          id="verify-email"
          label="Account email"
          hint="Only needed if you are not signed in."
          error={emailError}
        >
          <Input
            id="verify-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setEmailError(undefined);
            }}
            aria-invalid={Boolean(emailError) || undefined}
            className="h-11"
            disabled={resendPending}
          />
        </FormField>

        {resendState.status === "success" && resendState.message && (
          <AuthAlert tone="success" title="Email sent" description={resendState.message} />
        )}
        {resendState.status === "error" && resendState.message && (
          <AuthAlert tone="error" title="Could not resend" description={resendState.message} />
        )}

        <SubmitButton
          label="Resend verification email"
          loading={resendPending}
          loadingLabel="Sending…"
        />
      </form>

      <form onSubmit={onRetry}>
        <PremiumButton
          type="submit"
          premiumVariant="ghost"
          size="sm"
          className="w-full"
          disabled={retryPending}
          aria-busy={retryPending || undefined}
        >
          {retryPending ? "Retrying…" : "Retry profile setup"}
        </PremiumButton>
        {retryState.status === "success" && retryState.message && (
          <p className="mt-2 text-center text-xs text-success" role="status">
            {retryState.message}
          </p>
        )}
        {retryState.status === "error" && retryState.message && (
          <p className="mt-2 text-center text-xs text-destructive" role="alert">
            {retryState.message}
          </p>
        )}
      </form>

      <p className="text-center text-xs text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Return to login
        </Link>
      </p>
    </div>
  );
}
