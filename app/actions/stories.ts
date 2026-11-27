"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/dal";
import {
  deleteOwnedStory,
  recordStoryView,
  setStoryReaction,
} from "@/lib/db/stories";
import {
  getActiveStoryOwnerId,
  recordStoryReactionNotification,
} from "@/lib/db/notifications";
import {
  canReactToStory,
  canReplyToStory,
  getPrivacyContext,
} from "@/lib/privacy/service";
import { toSafeMessage } from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { STORAGE_BUCKETS } from "@/lib/storage";
import { removeStorageObjects } from "@/lib/storage/upload";
import { storagePathOwner } from "@/lib/storage/paths";
import type { StoryActionState } from "@/lib/stories/action-state";
import {
  storyIdSchema,
  storyReactionSchema,
} from "@/lib/validations/story";

async function currentViewerId(): Promise<string | null> {
  try {
    const current = await getCurrentProfile();
    return current?.user.id ?? null;
  } catch (error) {
    logServerError("stories.action.identity", error);
    return null;
  }
}

/** Records one unique view for the session-derived viewer. */
export async function recordStoryViewAction(storyId: string): Promise<boolean> {
  const parsed = storyIdSchema.safeParse(storyId);
  if (!parsed.success) return false;

  const viewerId = await currentViewerId();
  if (!viewerId) return false;
  if (!consumeRateLimit(`stories:view:${viewerId}`, 60, 60_000).allowed) return false;

  try {
    const ownerId = await getActiveStoryOwnerId(parsed.data, viewerId);
    if (!ownerId) return false;
    const context = await getPrivacyContext(viewerId, ownerId);
    if (!canReplyToStory(context)) return false;
    return await recordStoryView(parsed.data, viewerId);
  } catch (error) {
    logServerError("stories.action.view", error, { storyId: parsed.data });
    return false;
  }
}

/** Adds, changes, or removes the caller's single reaction to a story. */
export async function storyReactionAction(
  storyId: string,
  emoji: string | null,
): Promise<StoryActionState> {
  const parsed = storyReactionSchema.safeParse({ storyId, emoji });
  if (!parsed.success) {
    return { status: "error", message: "Choose a valid reaction." };
  }

  const viewerId = await currentViewerId();
  if (!viewerId) {
    return { status: "error", message: "Sign in to react to stories." };
  }
  if (!consumeRateLimit(`stories:reaction:${viewerId}`, 40, 10 * 60_000).allowed) {
    return { status: "error", message: "Too many reactions. Please wait a moment." };
  }

  try {
    const ownerId = await getActiveStoryOwnerId(parsed.data.storyId, viewerId);
    if (!ownerId) {
      return { status: "error", message: "That story is no longer available." };
    }
    const context = await getPrivacyContext(viewerId, ownerId);
    if (!canReactToStory(context)) {
      return { status: "error", message: "You cannot react to this story." };
    }

    const result = await setStoryReaction(
      parsed.data.storyId,
      viewerId,
      parsed.data.emoji,
    );
    if (result.emoji) {
      await recordStoryReactionNotification(ownerId, viewerId, parsed.data.storyId);
    }
    return {
      status: "success",
      emoji: result.emoji,
      message: result.emoji === null ? "Reaction removed." : "Reaction saved.",
    };
  } catch (error) {
    logServerError("stories.action.reaction", error, { storyId: parsed.data.storyId });
    return { status: "error", message: toSafeMessage(error) };
  }
}

/**
 * Deletes only an owned story. Storage cleanup is attempted after the database
 * delete and its failure is reported instead of being presented as success.
 */
export async function deleteStoryAction(storyId: string): Promise<StoryActionState> {
  const parsed = storyIdSchema.safeParse(storyId);
  if (!parsed.success) {
    return { status: "error", message: "That story could not be found." };
  }

  const current = await getCurrentProfile().catch((error) => {
    logServerError("stories.action.deleteIdentity", error);
    return null;
  });
  if (!current) {
    return { status: "error", message: "Sign in to delete a story." };
  }

  try {
    const storagePath = await deleteOwnedStory(parsed.data, current.user.id);
    if (!storagePath) {
      return { status: "error", message: "That story could not be found." };
    }

    let storyCleanupFailed = false;
    if (storagePathOwner(storagePath) === current.user.authUserId) {
      storyCleanupFailed = !(await removeStorageObjects(STORAGE_BUCKETS.STORIES, [
        storagePath,
      ]));
    } else {
      storyCleanupFailed = true;
      logServerError("stories.action.deletePathOwnerMismatch", new Error("Owner mismatch"), {
        storyId: parsed.data,
      });
    }

    revalidatePath("/posts");
    revalidatePath(`/stories/${current.user.id}`);

    return {
      status: "success",
      storyCleanupFailed,
      message: storyCleanupFailed
        ? "Story deleted, but its image could not be removed from storage."
        : "Story deleted.",
    };
  } catch (error) {
    logServerError("stories.action.delete", error, { storyId: parsed.data });
    return { status: "error", message: toSafeMessage(error) };
  }
}
