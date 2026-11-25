"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/dal";
import {
  createComment,
  deleteOwnComment,
  likePost,
  unlikePost,
} from "@/lib/db/engagement";
import { toSafeMessage } from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import type {
  CommentActionState,
  LikeActionState,
} from "@/lib/profile/action-state";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import {
  createCommentSchema,
  deleteCommentSchema,
  likeActionSchema,
} from "@/lib/validations/post";

function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function sessionIdentity(scope: string) {
  try {
    const current = await getCurrentProfile();
    if (!current) {
      return { error: { status: "error" as const, message: "Sign in to join the conversation." } };
    }
    return { current };
  } catch (cause) {
    logServerError(scope, cause);
    return {
      error: {
        status: "error" as const,
        message: "We could not verify your account. Please try again.",
      },
    };
  }
}

function revalidatePost(postId: string, username: string): void {
  revalidatePath("/posts");
  revalidatePath(`/post/${postId}`);
  revalidatePath(`/profile/${username}`);
}

async function changeLike(
  formData: FormData,
  intent: "like" | "unlike",
): Promise<LikeActionState> {
  const identity = await sessionIdentity("engagement.like.identity");
  if (identity.error) return identity.error;

  const parsed = likeActionSchema.safeParse({
    postId: formText(formData, "postId"),
    intent,
  });
  if (!parsed.success) {
    return { status: "error", message: "That post could not be identified." };
  }

  const { current } = identity;
  if (!consumeRateLimit(`engagement:like:${current.user.id}`, 40, 60_000).allowed) {
    return { status: "error", message: "Too many reactions. Please wait a moment." };
  }

  try {
    const state =
      intent === "like"
        ? await likePost(parsed.data.postId, current.user.id)
        : await unlikePost(parsed.data.postId, current.user.id);
    if (!state) {
      return { status: "error", message: "That post is no longer available." };
    }

    revalidatePost(parsed.data.postId, current.user.username);
    return { status: "success", liked: state.liked, likeCount: state.likeCount };
  } catch (cause) {
    logServerError("engagement.like.failed", cause, { postId: parsed.data.postId });
    return { status: "error", message: toSafeMessage(cause) };
  }
}

/** Like action with session-derived identity and DB-derived state. */
export async function likePostAction(
  _state: LikeActionState,
  formData: FormData,
): Promise<LikeActionState> {
  return changeLike(formData, "like");
}

/** Unlike action that only removes the caller's own like. */
export async function unlikePostAction(
  _state: LikeActionState,
  formData: FormData,
): Promise<LikeActionState> {
  return changeLike(formData, "unlike");
}

/** Creates a validated comment; ownership comes from the session only. */
export async function createCommentAction(
  _state: CommentActionState,
  formData: FormData,
): Promise<CommentActionState> {
  const identity = await sessionIdentity("engagement.comment.identity");
  if (identity.error) return identity.error;

  const parsed = createCommentSchema.safeParse({
    postId: formText(formData, "postId"),
    content: formText(formData, "content"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter a valid comment.",
    };
  }

  const { current } = identity;
  if (!consumeRateLimit(`engagement:comment:${current.user.id}`, 12, 60_000).allowed) {
    return { status: "error", message: "Too many comments. Please wait a moment." };
  }

  try {
    const created = await createComment(
      parsed.data.postId,
      current.user.id,
      parsed.data.content,
    );
    if (!created) {
      return { status: "error", message: "That post is no longer available." };
    }

    revalidatePost(parsed.data.postId, current.user.username);
    return {
      status: "success",
      commentId: created.comment.id,
      commentCount: created.commentCount,
    };
  } catch (cause) {
    logServerError("engagement.comment.failed", cause, { postId: parsed.data.postId });
    return { status: "error", message: toSafeMessage(cause) };
  }
}

/** Deletes only a comment owned by the authenticated user. */
export async function deleteCommentAction(
  _state: CommentActionState,
  formData: FormData,
): Promise<CommentActionState> {
  const identity = await sessionIdentity("engagement.comment.delete.identity");
  if (identity.error) return identity.error;

  const parsed = deleteCommentSchema.safeParse({
    commentId: formText(formData, "commentId"),
  });
  if (!parsed.success) {
    return { status: "error", message: "That comment could not be identified." };
  }

  const { current } = identity;
  if (!consumeRateLimit(`engagement:comment-delete:${current.user.id}`, 20, 10 * 60_000).allowed) {
    return { status: "error", message: "Too many changes. Please wait a moment." };
  }

  try {
    const deleted = await deleteOwnComment(parsed.data.commentId, current.user.id);
    if (!deleted) {
      return { status: "error", message: "That comment is no longer available." };
    }

    revalidatePost(deleted.postId, current.user.username);
    return { status: "success", commentCount: deleted.commentCount };
  } catch (cause) {
    logServerError("engagement.comment.delete.failed", cause, {
      commentId: parsed.data.commentId,
    });
    return { status: "error", message: toSafeMessage(cause) };
  }
}
