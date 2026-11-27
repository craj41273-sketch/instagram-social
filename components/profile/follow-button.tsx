"use client";

import { useState, useTransition, useOptimistic } from "react";
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
  initialRequested?: boolean;
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
  pending,
}: {
  label: string;
  loadingLabel: string;
  premiumVariant: "gradient" | "soft" | "outline" | "danger";
  compact?: boolean;
  pending: boolean;
}) {
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

/** Real follow state with an instant optimistic toggle and server confirmation. */
export function FollowButton({
  targetUsername,
  initialFollowing,
  initialRequested = false,
  isAuthenticated,
  isSelf,
  loginHref,
  compact = false,
}: FollowButtonProps) {
  const [serverFollowing, setServerFollowing] = useState(initialFollowing);
  const [requested, setRequested] = useState(initialRequested);
  const [optimisticFollowing, setOptimisticFollowing] = useOptimistic(
    serverFollowing,
    (_current: boolean, next: boolean) => next,
  );
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; tone: "error" | "success" } | null>(null);

  if (isSelf) {
    return <StatusBadge tone="brand">This is you</StatusBadge>;
  }

  if (!isAuthenticated) {
    return (
      <PremiumButton premiumVariant="soft" size={compact ? "sm" : "lg"} asChild>
        <Link href={loginHref}>Sign in to follow</Link>
      </PremiumButton>
    );
  }

  function submit(intent: "follow" | "unfollow" | "cancel") {
    const nextFollowing = intent === "follow";
    setFeedback(null);
    setConfirming(false);
    setRequested(false);

    startTransition(async () => {
      setOptimisticFollowing(nextFollowing);

      const formData = new FormData();
      formData.set("username", targetUsername);
      formData.set("intent", intent);

      try {
        const result: FollowActionState = await followAction(
          initialFollowActionState(),
          formData,
        );

        if (typeof result.following === "boolean") {
          setServerFollowing(result.following);
        }
        if (typeof result.requested === "boolean") {
          setRequested(result.requested);
        }
        if (result.message) {
          setFeedback({
            text: result.message,
            tone: result.status === "error" ? "error" : "success",
          });
        }
      } catch {
        setFeedback({ text: "We could not update this follow. Please try again.", tone: "error" });
      }
    });
  }

  const showUnfollowConfirm = confirming && optimisticFollowing;

  return (
    <div className={cn("flex flex-col gap-1.5", !compact && "items-start")}>
      {showUnfollowConfirm ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit("unfollow");
          }}
        >
          <PendingAwareButton
            label="Confirm unfollow"
            loadingLabel="Unfollowing…"
            premiumVariant="danger"
            compact={compact}
            pending={isPending}
          />
          <PremiumButton
            type="button"
            premiumVariant="ghost"
            size={compact ? "sm" : "lg"}
            onClick={() => setConfirming(false)}
            disabled={isPending}
          >
            Cancel
          </PremiumButton>
        </form>
      ) : optimisticFollowing ? (
        <PremiumButton
          type="button"
          premiumVariant="outline"
          size={compact ? "sm" : "lg"}
          onClick={() => setConfirming(true)}
          aria-label={`Following ${targetUsername}. Select to unfollow.`}
          disabled={isPending}
          className={cn(!compact && "min-w-30")}
        >
          <Check aria-hidden="true" />
          Following
        </PremiumButton>
      ) : requested ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit("cancel");
          }}
        >
          <PendingAwareButton
            label="Requested"
            loadingLabel="Cancelling…"
            premiumVariant="soft"
            compact={compact}
            pending={isPending}
          />
        </form>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit("follow");
          }}
        >
          <PendingAwareButton
            label="Follow"
            loadingLabel="Following…"
            premiumVariant="gradient"
            compact={compact}
            pending={isPending}
          />
        </form>
      )}

      {feedback ? (
        <p
          role={feedback.tone === "error" ? "alert" : undefined}
          aria-live={feedback.tone === "success" ? "polite" : undefined}
          className={cn(
            "text-xs",
            feedback.tone === "error" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {feedback.text}
        </p>
      ) : null}
    </div>
  );
}
