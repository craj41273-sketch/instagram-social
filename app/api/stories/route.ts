import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth/dal";
import { createStoryRecord } from "@/lib/db/stories";
import { toSafeMessage } from "@/lib/errors";
import { getSupabaseServerEnv } from "@/lib/env/server";
import { logServerError } from "@/lib/logging";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { isSameOriginPost } from "@/lib/security/request-origin";
import { STORAGE_BUCKETS } from "@/lib/storage";
import {
  IMAGE_LIMITS,
  validateImageMetadata,
} from "@/lib/storage/image-validation";
import { storyMediaPath } from "@/lib/storage/image-validation";
import { removeStorageObjects, uploadValidatedImage } from "@/lib/storage/upload";
import { storyCreateInputSchema } from "@/lib/validations/story";

/** Multipart upload endpoint so story creation can report real progress. */

const MAX_STORY_REQUEST_BYTES = IMAGE_LIMITS.STORY_MEDIA_BYTES + 1024 * 1024;

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request.headers.get("origin"), request.nextUrl.origin)) {
    return error("That request did not come from this site.", 403);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_STORY_REQUEST_BYTES) {
    return error("That image is too large.", 413);
  }

  let current;
  try {
    current = await getCurrentProfile();
  } catch (cause) {
    logServerError("stories.create.identity", cause);
    return error("We could not verify your account. Please try again.", 401);
  }
  if (!current) return error("Sign in to publish a story.", 401);

  const viewerId = current.user.id;
  if (!consumeRateLimit(`stories:create:${viewerId}`, 8, 10 * 60_000).allowed) {
    return error("Too many stories. Please wait a moment before trying again.", 429);
  }

  try {
    getSupabaseServerEnv();
  } catch {
    return error(
      "Story uploads are not configured. Ask the site owner to set the Supabase environment variables.",
      503,
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (cause) {
    logServerError("stories.create.formData", cause, { userId: viewerId });
    return error("We could not read that upload. Please try again.", 400);
  }

  let mediaMeta: unknown = {};
  try {
    const raw = formText(formData, "mediaMeta");
    if (raw) mediaMeta = JSON.parse(raw) as unknown;
  } catch {
    return error("We could not read the image details. Please try again.", 400);
  }

  const file = formData.get("image");
  if (!file || typeof file === "string" || file.size === 0) {
    return error("Choose an image for your story.", 400);
  }

  let metadata;
  try {
    metadata = validateImageMetadata(file, IMAGE_LIMITS.STORY_MEDIA_BYTES);
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : "That image is not valid.", 400);
  }

  const parsed = storyCreateInputSchema.safeParse({
    caption: formText(formData, "caption"),
    textOverlay: formText(formData, "textOverlay"),
    mediaMeta,
    mimeType: metadata.mimeType,
  });
  if (!parsed.success) {
    return error(parsed.error.issues[0]?.message ?? "Enter a valid story.", 400);
  }

  const storyId = randomUUID();
  const storagePath = storyMediaPath(current.user.authUserId, storyId, metadata.extension);
  let uploaded = false;

  try {
    const mediaUrl = await uploadValidatedImage(file, {
      bucket: STORAGE_BUCKETS.STORIES,
      path: storagePath,
      maxBytes: IMAGE_LIMITS.STORY_MEDIA_BYTES,
      contentType: metadata.mimeType,
    });
    uploaded = true;

    const story = await createStoryRecord({
      id: storyId,
      userId: viewerId,
      storagePath,
      mediaUrl,
      mimeType: metadata.mimeType,
      byteSize: metadata.size,
      caption: parsed.data.caption,
      textOverlay: parsed.data.textOverlay || null,
    });

    revalidatePath("/posts");
    revalidatePath(`/stories/${viewerId}`);
    return NextResponse.json({ storyId: story.id, expiresAt: story.expiresAt }, { status: 201 });
  } catch (cause) {
    if (uploaded) {
      await removeStorageObjects(STORAGE_BUCKETS.STORIES, [storagePath]);
    }
    logServerError("stories.create.failed", cause, { userId: viewerId });
    return error(toSafeMessage(cause), 500);
  }
}
