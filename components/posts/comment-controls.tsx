"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import {
  createCommentAction,
  deleteCommentAction,
} from "@/app/actions/engagement";
import { PremiumButton } from "@/components/ui/premium-button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  initialCommentActionState,
  type CommentActionState,
} from "@/lib/profile/action-state";

interface CommentComposerProps {
  postId: string;
  isAuthenticated: boolean;
  loginHref: string;
}

function SubmitComment() {
  const { pending } = useFormStatus();
  return (
    <PremiumButton premiumVariant="soft" type="submit" size="sm" disabled={pending}>
      {pending ? "Posting..." : "Post comment"}
    </PremiumButton>
  );
}

/** Comment form with bounded text, pending protection, and clear-on-success. */
export function CommentComposer({
  postId,
  isAuthenticated,
  loginHref,
}: CommentComposerProps) {
  const [state, formAction] = useActionState<CommentActionState, FormData>(
    createCommentAction,
    initialCommentActionState(),
  );
  const [content, setContent] = useState("");
  const acknowledged = useRef<string | null>(null);
  const errorId = useId();
  const { toast } = useToast();

  useEffect(() => {
    if (
      state.status === "success" &&
      state.commentId &&
      acknowledged.current !== state.commentId
    ) {
      acknowledged.current = state.commentId;
      setContent("");
      toast({ title: "Comment added", tone: "success" });
    }
  }, [state, toast]);

  if (!isAuthenticated) {
    return (
      <PremiumButton premiumVariant="soft" size="sm" asChild>
        <Link href={loginHref}>Sign in to comment</Link>
      </PremiumButton>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="postId" value={postId} />
      <Textarea
        name="content"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        maxLength={1000}
        rows={2}
        placeholder="Add a comment..."
        aria-label="Add a comment"
        aria-invalid={state.status === "error"}
        aria-describedby={state.status === "error" ? errorId : undefined}
        required
      />
      {state.status === "error" && state.message ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {state.message}
        </p>
      ) : null}
      <div className="flex justify-end">
        <SubmitComment />
      </div>
    </form>
  );
}

/** Owner-only comment delete with a safe toast for the server result. */
export function DeleteCommentButton({ commentId }: { commentId: string }) {
  const [state, formAction] = useActionState<CommentActionState, FormData>(
    deleteCommentAction,
    initialCommentActionState(),
  );
  const { toast } = useToast();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || state.status === "idle") return;
    handled.current = true;
    toast({
      title: state.status === "success" ? "Comment deleted" : "Comment not deleted",
      description: state.status === "error" ? state.message : undefined,
      tone: state.status === "success" ? "success" : "error",
    });
  }, [state, toast]);

  return (
    <form action={formAction}>
      <input type="hidden" name="commentId" value={commentId} />
      <PremiumButton premiumVariant="ghost" size="sm" type="submit">
        Delete
      </PremiumButton>
    </form>
  );
}
