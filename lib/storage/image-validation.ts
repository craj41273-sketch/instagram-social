import {
  buildPostMediaPath,
  buildProfileImagePath,
  type ProfileImageKind,
} from "@/lib/storage/paths";

/**
 * Client-safe image validation shared by upload actions and tests. The browser
 * is never trusted: every rule here is re-applied on the server before bytes
 * reach Supabase Storage.
 */

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type ImageMimeType = (typeof IMAGE_MIME_TYPES)[number];

export const IMAGE_EXTENSIONS: Record<ImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const IMAGE_LIMITS = {
  AVATAR_BYTES: 5 * 1024 * 1024,
  COVER_BYTES: 8 * 1024 * 1024,
  POST_MEDIA_BYTES: 10 * 1024 * 1024,
  MAX_POST_MEDIA: 10,
} as const;

export interface UploadedFileMetadata {
  name: string;
  type: string;
  size: number;
}

export interface ValidatedImageMetadata {
  mimeType: ImageMimeType;
  extension: string;
  size: number;
}

export function isImageMimeType(value: string): value is ImageMimeType {
  return (IMAGE_MIME_TYPES as readonly string[]).includes(value);
}

/**
 * Validates the cheap metadata first. `arrayBuffer` bytes are checked later
 * with `detectImageMime` so a forged Content-Type cannot pass.
 */
function humanBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${Math.floor(bytes / (1024 * 1024))} MB`;
  }
  return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
}

export function validateImageMetadata(
  file: UploadedFileMetadata,
  maxBytes: number,
): ValidatedImageMetadata {
  if (!isImageMimeType(file.type)) {
    throw new Error("Choose a JPEG, PNG, WebP, or GIF image.");
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new Error("That image appears to be empty.");
  }
  if (file.size > maxBytes) {
    throw new Error(`That image exceeds the ${humanBytes(maxBytes)} size limit.`);
  }

  return {
    mimeType: file.type,
    extension: IMAGE_EXTENSIONS[file.type],
    size: file.size,
  };
}

/** Minimal magic-byte sniffing; avoids trusting the declared MIME type. */
export function detectImageMime(bytes: Uint8Array): ImageMimeType | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    (bytes[3] === 0x38 || bytes[3] === 0x39) &&
    bytes[4] === 0x37 &&
    bytes[5] === 0x61
  ) {
    return "image/gif";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

/** Rejects mismatched or unrecognized bytes before any upload is attempted. */
export function assertImageBytes(
  bytes: Uint8Array,
  expected: ImageMimeType,
  maxBytes: number,
): void {
  if (bytes.byteLength === 0 || bytes.byteLength > maxBytes) {
    throw new Error("That image is outside the allowed size limit.");
  }
  const detected = detectImageMime(bytes);
  if (detected !== expected) {
    throw new Error("The file contents do not match the selected image type.");
  }
}

export function profileImageMaxBytes(kind: ProfileImageKind): number {
  return kind === "avatar" ? IMAGE_LIMITS.AVATAR_BYTES : IMAGE_LIMITS.COVER_BYTES;
}

export function profileImagePath(
  authUserId: string,
  kind: ProfileImageKind,
): string {
  return buildProfileImagePath(authUserId, kind);
}

export function postMediaPath(
  authUserId: string,
  postId: string,
  position: number,
  objectId: string,
  extension: string,
): string {
  return buildPostMediaPath(authUserId, postId, position, objectId, extension);
}
