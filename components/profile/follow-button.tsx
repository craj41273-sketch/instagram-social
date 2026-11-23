"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Check } from "lucide-react";
import { followAction } from "@/app/actions/follows";
import {
  initialFollowActionState,
  type FollowActionState,
} from "@/lib/profile/action-state";
import { PremiumButton } from "@/components/ui/premium-button";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  targetUsername: string;
  initialFollowing: boolean;
  isAuthenticated: boolean;
  isSelf: boolean;
  loginHref: string;
  compact?: boolean;
}

function PendingAwareButton({
  label,
  loadingLabel,
  premiumVariant,
  compact,
}: {
  label: string;
  loadingLabel: string;
  premiumVariant: "gradient" | "soft" | "outline" | "danger";
  compact?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <PremiumButton
      type="submit"
      premiumVariant={premiumVariant}
      size={compact ? "sm" : "lg"}
      disabled={pending}
      aria-busy={pending || undefined}
      className={cn(!compact && "min-w-30")}
    >
      {pending ? (
        <>
          <Spinner className="size-4 text-current" label={loadingLabel} />
          {loadingLabel}
        </>
      ) : (
        label
      )}
    </PremiumButton>
  );
}

/** Real follow state: initial value comes from the database, updates from actions. */
export function FollowButton({
  targetUsername,
  initialFollowing,
  isAuthenticated,
  isSelf,
  loginHref,
  compact = false,
}: FollowButtonProps) {
  const [state, formAction] = useActionState<FollowActionState, FormData>(
    followAction,
    initialFollowActionState(),
  );
  const [confirming, setConfirming] = useState(false);

  if (isSelf) {
    return <StatusBadge tone="brand">This is you</StatusBadge>;
  }

  if (!isAuthenticated) {
    return (
      <PremiumButton
        premiumVariant="soft"
        size={compact ? "sm" : "lg"}
        asChild
      >
        <Link href={loginHref}>Sign in to follow</Link>
      </PremiumButton>
    );
  }

  const following = state.following ?? initialFollowing;
  const showUnfollowConfirm = confirming && following;

  return (
    <div className={cn("flex flex-col gap-1.5", !compact && "items-start")}>
      {showUnfollowConfirm ? (
        <form action={formAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="username" value={targetUsername} />
          <input type="hidden" name="intent" value="unfollow" />
          <PendingAwareButton
            label="Confirm unfollow"
            loadingLabel="Unfollowing…"
            premiumVariant="danger"
            compact={compact}
          />
          <PremiumButton
            type="button"
            premiumVariant="ghost"
            size={compact ? "sm" : "lg"}
            onClick={() => setConfirming(false)}
          >
            Cancel
          </PremiumButton>
        </form>
      ) : following ? (
        <PremiumButton
          type="button"
          premiumVariant="outline"
          size={compact ? "sm" : "lg"}
          onClick={() => setConfirming(true)}
          aria-label={`Following ${targetUsername}. Select to unfollow.`}
          className={cn(!compact && "min-w-30")}
        >
          <Check aria-hidden="true" />
          Following
        </PremiumButton>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="username" value={targetUsername} />
          <input type="hidden" name="intent" value="follow" />
          <PendingAwareButton
            label="Follow"
            loadingLabel="Following…"
            premiumVariant="gradient"
            compact={compact}
          />
        </form>
      )}

      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : undefined}
          aria-live={state.status === "success" ? "polite" : undefined}
          className={cn(
            "text-xs",
            state.status === "error" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
