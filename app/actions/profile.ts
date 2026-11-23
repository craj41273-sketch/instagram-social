"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/dal";
import type { ProfileActionState } from "@/lib/profile/action-state";
import {
  isUsernameAvailableForUser,
  updateOwnProfile,
} from "@/lib/db/profiles";
import { logServerError } from "@/lib/logging";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { toFormErrors } from "@/lib/validations/auth";
import {
  editProfileSchema,
  type EditProfileValues,
} from "@/lib/validations/profile";

const RATE_LIMIT_MESSAGE =
  "Too many changes. Please wait a moment before trying again.";

function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * Edits only the profile derived from the verified Supabase session. No user
 * ID, profile ID, or target username is accepted from the client.
 */
export async function updateProfileAction(
  _state: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  let current;
  try {
    current = await getCurrentProfile();
  } catch (error) {
    logServerError("profile.updateIdentity", error);
    return { status: "error", message: "We could not verify your account. Please try again." };
  }

  if (!current) {
    return { status: "error", message: "Sign in to edit your profile." };
  }

  const parsed = editProfileSchema.safeParse({
    displayName: formText(formData, "displayName"),
    username: formText(formData, "username"),
    bio: formText(formData, "bio"),
    website: formText(formData, "website"),
    location: formText(formData, "location"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      errors: toFormErrors<EditProfileValues>(parsed.error),
    };
  }

  const userId = current.user.id;
  if (!consumeRateLimit(`profile:update:${userId}`, 12, 10 * 60_000).allowed) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  const oldUsername = current.user.username;
  const nextUsername = parsed.data.username;

  if (nextUsername !== oldUsername) {
    try {
      if (!(await isUsernameAvailableForUser(nextUsername, userId))) {
        return {
          status: "error",
          message: "Please choose another username.",
          errors: { username: "That username is already taken." },
        };
      }
    } catch (error) {
      logServerError("profile.updateAvailability", error, { userId });
      return {
        status: "error",
        message: "We could not check username availability. Please try again.",
      };
    }
  }

  let updated;
  try {
    updated = await updateOwnProfile(userId, parsed.data);
  } catch (error) {
    logServerError("profile.update", error, { userId });
    return {
      status: "error",
      message:
        error instanceof Error && error.message.includes("username")
          ? "That username is already taken. Please choose another."
          : "We could not save your profile. Please try again.",
      errors:
        error instanceof Error && error.message.includes("username")
          ? { username: "That username is already taken." }
          : undefined,
    };
  }

  revalidatePath("/profile/edit");
  revalidatePath(`/profile/${oldUsername}`);
  revalidatePath(`/profile/${updated.username}`);
  revalidatePath("/profile/[username]/followers", "page");
  revalidatePath("/profile/[username]/following", "page");

  return {
    status: "success",
    message: "Your profile has been updated.",
    username: updated.username,
  };
}
