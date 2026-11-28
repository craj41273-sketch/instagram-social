"use server";

import { revalidatePath } from "next/cache";
import { getActiveProfile } from "@/lib/auth/dal";
import {
  deleteOwnPost,
  updateOwnPost,
} from "@/lib/db/posts";
import { toSafeMessage } from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import type { PostActionState } from "@/lib/profile/action-state";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { removeStorageObjects } from "@/lib/storage/upload";
import { STORAGE_BUCKETS } from "@/lib/storage";
import {
  deletePostSchema,
  editPostSchema,
} from "@/lib/validations/post";

function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function sessionIdentity(scope: string) {
  try {
    const current = await getActiveProfile();
    if (!current) {
      return { error: { status: "error" as const, message: "Sign in to manage posts." } };
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

/** Edits only the authenticated owner's caption and normalized hashtags. */
export async function updatePostAction(
  _state: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const identity = await sessionIdentity("posts.edit.identity");
  if (identity.error) return identity.error;

  const parsed = editPostSchema.safeParse({
    postId: formText(formData, "postId"),
    caption: formText(formData, "caption"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter a valid caption.",
    };
  }

  const { current } = identity;
  if (!consumeRateLimit(`posts:edit:${current.user.id}`, 20, 10 * 60_000).allowed) {
    return { status: "error", message: "Too many edits. Please wait a moment." };
  }

  try {
    const post = await updateOwnPost(
      parsed.data.postId,
      current.user.id,
      parsed.data.caption,
    );
    if (!post) {
      return { status: "error", message: "That post is no longer available." };
    }

    revalidatePath("/posts");
    revalidatePath(`/post/${post.id}`);
    revalidatePath(`/profile/${current.user.username}`);
    return {
      status: "success",
      postId: post.id,
      message: "Post updated.",
    };
  } catch (cause) {
    logServerError("posts.edit.failed", cause, { postId: parsed.data.postId });
    return { status: "error", message: toSafeMessage(cause) };
  }
}

/** Deletes the authenticated owner's post, media rows, and storage objects. */
export async function deletePostAction(
  _state: PostActionState,
  formData: FormData,
): Promise<PostActionState> {
  const identity = await sessionIdentity("posts.delete.identity");
  if (identity.error) return identity.error;

  const parsed = deletePostSchema.safeParse({
    postId: formText(formData, "postId"),
  });
  if (!parsed.success) {
    return { status: "error", message: "That post could not be identified." };
  }

  const { current } = identity;
  if (!consumeRateLimit(`posts:delete:${current.user.id}`, 20, 10 * 60_000).allowed) {
    return { status: "error", message: "Too many changes. Please wait a moment." };
  }

  try {
    const deleted = await deleteOwnPost(parsed.data.postId, current.user.id);
    if (!deleted) {
      return { status: "error", message: "That post is no longer available." };
    }

    await removeStorageObjects(STORAGE_BUCKETS.POST_MEDIA, deleted.storagePaths);
    revalidatePath("/posts");
    revalidatePath(`/post/${deleted.id}`);
    revalidatePath(`/profile/${current.user.username}`);
    return {
      status: "success",
      postId: deleted.id,
      message: "Post deleted.",
    };
  } catch (cause) {
    logServerError("posts.delete.failed", cause, { postId: parsed.data.postId });
    return { status: "error", message: toSafeMessage(cause) };
  }
}
