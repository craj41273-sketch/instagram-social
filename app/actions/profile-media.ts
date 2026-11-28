"use server";

import { revalidatePath } from "next/cache";
import { getActiveProfile } from "@/lib/auth/dal";
import { updateProfileImage } from "@/lib/db/profiles";
import { toSafeMessage } from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import type { MediaActionState } from "@/lib/profile/action-state";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { profileImageMaxBytes, profileImagePath } from "@/lib/storage/image-validation";
import type { ProfileImageKind } from "@/lib/storage/paths";
import {
  uploadValidatedImage,
  type UploadableFile,
} from "@/lib/storage/upload";
import { STORAGE_BUCKETS } from "@/lib/storage";

function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * Uploads an owner avatar/cover using the session-derived auth user ID as the
 * storage prefix. The target profile cannot be chosen by the client.
 */
export async function uploadProfileMediaAction(
  _state: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  const kind = formText(formData, "kind");
  if (kind !== "avatar" && kind !== "cover") {
    return { status: "error", message: "Choose an avatar or cover image." };
  }

  let current;
  try {
    current = await getActiveProfile();
  } catch (error) {
    logServerError("profileMedia.identity", error);
    return { status: "error", message: "We could not verify your account. Please try again." };
  }

  if (!current) {
    return { status: "error", message: "Sign in to upload profile images." };
  }

  const viewerId = current.user.id;
  if (!consumeRateLimit(`profile-media:${viewerId}`, 12, 10 * 60_000).allowed) {
    return { status: "error", message: "Too many uploads. Please wait a moment." };
  }

  const file = formData.get("image");
  if (!file || typeof file === "string") {
    return { status: "error", message: "Choose an image to upload." };
  }

  const imageKind: ProfileImageKind = kind;

  try {
    const path = profileImagePath(current.user.authUserId, imageKind);
    const publicUrl = await uploadValidatedImage(file as UploadableFile, {
      bucket: STORAGE_BUCKETS.AVATARS,
      path,
      maxBytes: profileImageMaxBytes(imageKind),
      contentType: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
      upsert: true,
    });

    await updateProfileImage(viewerId, imageKind, publicUrl);
    revalidatePath("/profile/edit");
    revalidatePath(`/profile/${current.user.username}`);

    return {
      status: "success",
      message: imageKind === "avatar" ? "Avatar updated." : "Cover updated.",
    };
  } catch (error) {
    logServerError("profileMedia.upload", error, { userId: viewerId, kind: imageKind });
    return { status: "error", message: toSafeMessage(error) };
  }
}
