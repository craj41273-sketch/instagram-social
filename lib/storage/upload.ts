import "server-only";
import { NetworkError, ValidationError } from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import { safeHttpUrl } from "@/lib/profile/format";
import {
  assertImageBytes,
  validateImageMetadata,
  type ImageMimeType,
} from "@/lib/storage/image-validation";
import {
  createSupabaseStorageClient,
  type StorageBucket,
} from "@/lib/storage";

/** Server-only Supabase Storage operations. Bytes are never written to Neon. */

export interface UploadableFile {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface UploadImageOptions {
  bucket: StorageBucket;
  path: string;
  maxBytes: number;
  contentType: ImageMimeType;
  upsert?: boolean;
}

/** Validates metadata and magic bytes, then uploads to an owner-namespaced key. */
export async function uploadValidatedImage(
  file: UploadableFile,
  options: UploadImageOptions,
): Promise<string> {
  const metadata = validateImageMetadata(file, options.maxBytes);

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch (error) {
    logServerError("storage.readFile", error, { fileNameLength: file.name.length });
    throw new ValidationError("We could not read that image. Please choose another file.");
  }

  try {
    assertImageBytes(bytes, metadata.mimeType, options.maxBytes);
  } catch (error) {
    throw new ValidationError(
      error instanceof Error ? error.message : "That image is not valid.",
    );
  }

  try {
    const storage = await createSupabaseStorageClient();
    const { error } = await storage
      .from(options.bucket)
      .upload(options.path, bytes, {
        contentType: options.contentType,
        cacheControl: "3600",
        upsert: options.upsert ?? false,
      });

    if (error) {
      logServerError("storage.upload", error, {
        bucket: options.bucket,
        pathLength: options.path.length,
      });
      throw new NetworkError("We could not upload that image. Please try again.");
    }

    const { data } = storage.from(options.bucket).getPublicUrl(options.path);
    const publicUrl = safeHttpUrl(data?.publicUrl);
    if (!publicUrl) {
      throw new NetworkError("We could not build a public link for that image.");
    }
    return publicUrl;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NetworkError) throw error;
    logServerError("storage.uploadUnknown", error, {
      bucket: options.bucket,
      pathLength: options.path.length,
    });
    throw new NetworkError("We could not upload that image. Please try again.");
  }
}

/** Best-effort cleanup after a partial multi-file upload failure. */
export async function removeStorageObjects(
  bucket: StorageBucket,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return;

  try {
    const storage = await createSupabaseStorageClient();
    const { error } = await storage.from(bucket).remove(paths);
    if (error) {
      logServerError("storage.remove", error, { bucket, count: paths.length });
    }
  } catch (error) {
    logServerError("storage.removeUnknown", error, { bucket, count: paths.length });
  }
}
