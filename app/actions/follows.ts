"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveProfile } from "@/lib/auth/dal";
import { getDb } from "@/lib/db";
import { unfollowUser } from "@/lib/db/follows";
import { getPublicProfileByUsername, isPrivateProfile } from "@/lib/db/profiles";
import { followRequests } from "@/lib/db/schema";
import { recordFollowNotification } from "@/lib/db/notifications";
import { getPrivacyContext } from "@/lib/privacy/service";
import { logServerError } from "@/lib/logging";
import {
  cancelFollowRequest,
  followWithPrivacy,
  removeFollower,
  respondToFollowRequest,
} from "@/lib/privacy/relationships";
import type { FollowActionState } from "@/lib/profile/action-state";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { usernameSchema } from "@/lib/validations/auth";

const RATE_LIMIT_MESSAGE =
  "Too many follow changes. Please wait a moment before trying again.";

const followActionInputSchema = z.object({
  username: usernameSchema,
  intent: z.enum([
    "follow",
    "unfollow",
    "request",
    "cancel",
    "accept",
    "decline",
    "remove_follower",
  ]),
});

function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Applies a session-derived follow mutation; private targets create a request. */
export async function followAction(
  _state: FollowActionState,
  formData: FormData,
): Promise<FollowActionState> {
  const parsed = followActionInputSchema.safeParse({
    username: formText(formData, "username"),
    intent: formText(formData, "intent"),
  });

  if (!parsed.success) {
    return { status: "error", message: "That profile is not available." };
  }

  let current;
  try {
    current = await getActiveProfile();
  } catch (error) {
    logServerError("follow.identity", error);
    return { status: "error", message: "We could not verify your account. Please try again." };
  }

  if (!current) {
    return { status: "error", message: "Sign in to follow people." };
  }

  const { username, intent } = parsed.data;
  const viewerId = current.user.id;

  if (!consumeRateLimit(`follow:${viewerId}`, 30, 60_000).allowed) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  let target;
  try {
    target = await getPublicProfileByUsername(username);
  } catch (error) {
    logServerError("follow.target", error, { userId: viewerId });
    return { status: "error", message: "We could not load that profile. Please try again." };
  }

  if (!target) {
    return { status: "error", message: "That profile is not available." };
  }

  if (target.userId === viewerId) {
    return { status: "error", message: "You cannot follow yourself." };
  }

  try {
    let following = false;
    let requested = false;
    let message = "You are no longer following this profile.";

    if (intent === "follow" || intent === "request") {
      let result: { following: boolean; requested: boolean; alreadyFollowing: boolean };
      if (await isPrivateProfile(target.userId)) {
        const context = await getPrivacyContext(viewerId, target.userId);
        if (
          context.blockedByViewer ||
          context.blockedViewer ||
          context.targetStatus === "banned"
        ) {
          throw new Error("You cannot follow this account.");
        }
        if (context.viewerFollowsTarget) {
          result = { following: true, requested: false, alreadyFollowing: true };
        } else {
          await getDb()
            .insert(followRequests)
            .values({ requesterId: viewerId, targetId: target.userId })
            .onConflictDoUpdate({
              target: [followRequests.requesterId, followRequests.targetId],
              set: { status: "pending", updatedAt: new Date() },
            });
          result = { following: false, requested: true, alreadyFollowing: false };
        }
      } else {
        result = await followWithPrivacy(viewerId, target.userId);
      }
      following = result.following;
      requested = result.requested;
      if (following && !result.alreadyFollowing) {
        await recordFollowNotification(target.userId, viewerId);
      }
      message = requested
        ? "Your follow request was sent."
        : result.alreadyFollowing
          ? "You are already following this profile."
          : "You are now following this profile.";
    } else if (intent === "unfollow") {
      await unfollowUser(viewerId, target.userId);
    } else if (intent === "cancel") {
      await cancelFollowRequest(viewerId, target.userId);
      message = "Follow request cancelled.";
    } else if (intent === "accept" || intent === "decline") {
      await respondToFollowRequest(viewerId, target.userId, intent === "accept");
      if (intent === "accept") {
        following = true;
        await recordFollowNotification(target.userId, viewerId);
      }
      message = intent === "accept" ? "Follow request accepted." : "Follow request declined.";
    } else {
      await removeFollower(viewerId, target.userId);
      message = "That follower was removed.";
    }

    revalidateAfterFollow(username, current.user.username);
    return { status: "success", following, requested, message };
  } catch (error) {
    logServerError("follow.mutation", error, { userId: viewerId });
    return {
      status: "error",
      message:
        error instanceof Error && error.message.includes("yourself")
          ? "You cannot follow yourself."
          : "We could not update this follow. Please try again.",
    };
  }
}

function revalidateAfterFollow(username: string, viewerUsername: string): void {
  revalidatePath(`/profile/${username}`);
  revalidatePath(`/profile/${viewerUsername}`);
  revalidatePath("/profile/[username]/followers", "page");
  revalidatePath("/profile/[username]/following", "page");
}
