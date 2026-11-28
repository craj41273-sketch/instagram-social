import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getActiveProfile } from "@/lib/auth/dal";
import {
  createPostRecord,
  deletePostRecordById,
  insertPostHashtags,
  insertPostMedia,
} from "@/lib/db/posts";
import type { NewPostMedia } from "@/lib/db/schema";
import { ValidationError, toSafeMessage } from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import { extractHashtags } from "@/lib/posts/hashtags";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { isSameOriginPost } from "@/lib/security/request-origin";
import {
  IMAGE_LIMITS,
  MAX_POST_REQUEST_BYTES,
  validateImageMetadata,
} from "@/lib/storage/image-validation";
import { buildPostMediaPath } from "@/lib/storage/paths";
import { removeStorageObjects, uploadValidatedImage } from "@/lib/storage/upload";
import { STORAGE_BUCKETS } from "@/lib/storage";
import { postCaptionSchema, postMediaMetaListSchema } from "@/lib/validations/post";

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * Authenticated multipart endpoint for multi-image posts. XHR is used here (in
 * place of a Server Action) so the browser can report real upload progress.
 * All identity and validation decisions remain server-side.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request.headers.get("origin"), request.nextUrl.origin)) {
    return error("That request did not come from this site.", 403);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_POST_REQUEST_BYTES) {
    return error("That upload is too large.", 413);
  }

  let current;
  try {
    current = await getActiveProfile();
  } catch (cause) {
    logServerError("posts.create.identity", cause);
    return error("We could not verify your account. Please try again.", 401);
  }
  if (!current) return error("Sign in to publish a post.", 401);

  const viewerId = current.user.id;
  if (!consumeRateLimit(`posts:create:request:${viewerId}`, 30, 10 * 60_000).allowed) {
    return error("Too many uploads. Please try again.", 429);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (cause) {
    logServerError("posts.create.formData", cause, { userId: viewerId });
    return error("We could not read that upload. Please try again.", 400);
  }

  const captionResult = postCaptionSchema.safeParse(formText(formData, "caption"));
  if (!captionResult.success) {
    return error(captionResult.error.issues[0]?.message ?? "Enter a valid caption.", 400);
  }

  const files = formData
    .getAll("media")
    .filter((value): value is File => typeof value !== "string" && value.size > 0);

  if (files.length === 0) {
    return error("Add at least one image.", 400);
  }
  if (files.length > IMAGE_LIMITS.MAX_POST_MEDIA) {
    return error(`Add at most ${IMAGE_LIMITS.MAX_POST_MEDIA} images.`, 400);
  }

  let meta: ReturnType<typeof parseMediaMeta>;
  try {
    meta = parseMediaMeta(formText(formData, "mediaMeta"));
  } catch (cause) {
    logServerError("posts.create.mediaMeta", cause, { userId: viewerId });
    return error("We could not read the image details. Please try again.", 400);
  }

  if (!consumeRateLimit(`posts:create:${viewerId}`, 6, 10 * 60_000).allowed) {
    return error("Too many posts. Please wait a moment before trying again.", 429);
  }

  const postId = randomUUID();
  const uploadedPaths: string[] = [];
  let postCreated = false;

  try {
    const mediaValues: NewPostMedia[] = [];

    for (const [index, file] of files.entries()) {
      let validated: ReturnType<typeof validateImageMetadata>;
      try {
        validated = validateImageMetadata(file, IMAGE_LIMITS.POST_MEDIA_BYTES);
      } catch (cause) {
        return error(
          cause instanceof Error ? cause.message : "That image is not valid.",
          400,
        );
      }
      const storagePath = buildPostMediaPath(
        current.user.authUserId,
        postId,
        index,
        randomUUID(),
        validated.extension,
      );

      const publicUrl = await uploadValidatedImage(file, {
        bucket: STORAGE_BUCKETS.POST_MEDIA,
        path: storagePath,
        maxBytes: IMAGE_LIMITS.POST_MEDIA_BYTES,
        contentType: validated.mimeType,
      });
      uploadedPaths.push(storagePath);

      const hints = meta[index];
      mediaValues.push({
        postId,
        storagePath,
        publicUrl,
        mimeType: validated.mimeType,
        byteSize: validated.size,
        width: hints?.width ?? null,
        height: hints?.height ?? null,
        altText: hints?.altText ?? null,
        position: index,
      });
    }

    await createPostRecord({ id: postId, userId: viewerId, caption: captionResult.data });
    postCreated = true;
    await insertPostMedia(mediaValues);
    await insertPostHashtags(postId, extractHashtags(captionResult.data));
  } catch (cause) {
    if (postCreated) {
      try {
        await deletePostRecordById(postId, viewerId);
      } catch (cleanupError) {
        logServerError("posts.create.cleanupDatabase", cleanupError, { postId });
      }
    }
    await removeStorageObjects(STORAGE_BUCKETS.POST_MEDIA, uploadedPaths);
    logServerError("posts.create.failed", cause, { userId: viewerId });
    return error(
      toSafeMessage(cause),
      cause instanceof ValidationError ? 400 : 500,
    );
  }

  revalidatePath("/posts");
  revalidatePath(`/post/${postId}`);
  revalidatePath(`/profile/${current.user.username}`);

  return NextResponse.json({ postId }, { status: 201 });
}

function parseMediaMeta(raw: string) {
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  const result = postMediaMetaListSchema.safeParse(parsed);
  if (!result.success) throw result.error;
  return result.data;
}
