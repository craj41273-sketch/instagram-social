"use client";

import { useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { likePostAction, unlikePostAction } from "@/lib/static/actions";
import { PremiumButton } from "@/components/ui/premium-button";
import {
  initialLikeActionState,
  type LikeActionState,
} from "@/lib/profile/action-state";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  postId: string;
  initialLiked: boolean;
  initialLikeCount: number;
  isAuthenticated: boolean;
  loginHref: string;
}

/** Optimistic like control; the server result is authoritative and rollback is explicit. */
export function LikeButton({
  postId,
  initialLiked,
  initialLikeCount,
  isAuthenticated,
  loginHref,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  const errorId = useId();

  if (!isAuthenticated) {
    return (
      <PremiumButton premiumVariant="ghost" size="sm" asChild>
        <Link href={loginHref} aria-label="Sign in to like this post">
          <Heart className="size-4" aria-hidden="true" />
          <span>{likeCount}</span>
        </Link>
      </PremiumButton>
    );
  }

  function toggle() {
    if (busy.current) return;

    const nextLiked = !liked;
    busy.current = true;
    setLiked(nextLiked);
    setLikeCount((count) => Math.max(0, count + (nextLiked ? 1 : -1)));
    setError(null);

    const formData = new FormData();
    formData.set("postId", postId);
    const action = nextLiked ? likePostAction : unlikePostAction;

    startTransition(async () => {
      try {
        const result: LikeActionState = await action(initialLikeActionState(), formData);
        if (result.status !== "success") {
          throw new Error(result.message ?? "Your reaction could not be saved.");
        }
        setLiked(result.liked ?? nextLiked);
        setLikeCount(result.likeCount ?? likeCount);
      } catch {
        setLiked(!nextLiked);
        setLikeCount((count) => Math.max(0, count + (nextLiked ? -1 : 1)));
        setError("Your reaction could not be saved. Please try again.");
      } finally {
        busy.current = false;
      }
    });
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={liked}
        aria-label={liked ? "Unlike post" : "Like post"}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60",
          liked && "text-rose-500 hover:text-rose-500",
        )}
      >
        <Heart
          className={cn(
            "size-5 transition-transform duration-200 motion-reduce:transition-none",
            liked && "scale-110 fill-current",
          )}
          aria-hidden="true"
        />
        <span aria-live="polite">{likeCount}</span>
      </button>
      {error ? (
        <span id={errorId} role="alert" className="px-2 text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
