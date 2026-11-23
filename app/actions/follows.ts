"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/dal";
import { followUser, unfollowUser } from "@/lib/db/follows";
import { getPublicProfileByUsername } from "@/lib/db/profiles";
import { logServerError } from "@/lib/logging";
import type { FollowActionState } from "@/lib/profile/action-state";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { followActionSchema } from "@/lib/validations/profile";

const RATE_LIMIT_MESSAGE =
  "Too many follow changes. Please wait a moment before trying again.";

function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Toggles a real follow edge using only session-derived identity. */
export async function followAction(
  _state: FollowActionState,
  formData: FormData,
): Promise<FollowActionState> {
  const parsed = followActionSchema.safeParse({
    username: formText(formData, "username"),
    intent: formText(formData, "intent"),
  });

  if (!parsed.success) {
    return { status: "error", message: "That profile is not available." };
  }

  let current;
  try {
    current = await getCurrentProfile();
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
    if (intent === "follow") {
      const result = await followUser(viewerId, target.userId);
      revalidateAfterFollow(username, current.user.username);
      return {
        status: "success",
        following: true,
        message: result.alreadyFollowing
          ? "You are already following this profile."
          : "You are now following this profile.",
      };
    }

    await unfollowUser(viewerId, target.userId);
    revalidateAfterFollow(username, current.user.username);
    return {
      status: "success",
      following: false,
      message: "You are no longer following this profile.",
    };
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
