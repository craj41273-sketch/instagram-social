"use client";

import * as React from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { AuthAlert } from "@/components/auth/auth-alert";
import { PremiumButton } from "@/components/ui/premium-button";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { waitForPreviewState } from "@/lib/auth-preview";

interface VerifyEmailFormProps {
  token?: string;
}

/** Verification UI prepared for a backend token; never reports a fake success. */
export function VerifyEmailForm({ token }: VerifyEmailFormProps) {
  const [resendStatus, setResendStatus] = React.useState<
    "idle" | "loading" | "error"
  >("idle");

  async function onResend() {
    if (resendStatus === "loading") return;
    setResendStatus("loading");
    await waitForPreviewState();
    setResendStatus("error");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone="warning">Awaiting backend</StatusBadge>
        <span className="text-xs text-muted-foreground">
          Verification is not simulated in this preview.
        </span>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-surface/60 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Mail className="size-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-medium">Check your inbox</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            In a connected app, the verification link would open this page with a
            token, which would then be confirmed with Supabase Auth.
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {token
          ? "A verification token was detected in the URL and will be used when the backend is available."
          : "No verification token was found in the URL."}
      </p>

      {resendStatus === "error" && (
        <AuthAlert
          tone="error"
          title="Could not resend the email"
          description="Email delivery is not configured yet, so nothing was sent. This is expected in the current frontend-only block."
        />
      )}

      <PremiumButton
        type="button"
        premiumVariant="outline"
        size="lg"
        className="w-full"
        onClick={onResend}
        disabled={resendStatus === "loading"}
        aria-busy={resendStatus === "loading" || undefined}
      >
        {resendStatus === "loading" ? (
          <>
            <Spinner className="size-4 text-current" label="Sending" />
            Sending…
          </>
        ) : (
          "Resend verification email"
        )}
      </PremiumButton>

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
