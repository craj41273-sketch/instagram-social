/**
 * Pure, client-safe storage path helpers. No environment access or Supabase
 * imports live here so tests can assert that object keys cannot escape a
 * caller-owned prefix.
 */

export type ProfileImageKind = "avatar" | "cover";

/** Normalizes object keys so paths cannot escape a bucket prefix. */
export function storageObjectKey(parts: string[]): string {
  const safeParts = parts
    .flatMap((part) =>
      part
        .split(/[\\/]+/)
        .map((segment) => segment.replace(/\.\./g, ""))
        .filter(Boolean),
    )
    .filter(Boolean);
  return safeParts.join("/");
}

/**
 * Profile media uses a deterministic key per authenticated user. Reuploads
 * replace the same object, so stale files do not accumulate.
 */
export function buildProfileImagePath(
  authUserId: string,
  kind: ProfileImageKind,
): string {
  return storageObjectKey([authUserId, "profile", kind]);
}

/** Post media is namespaced by owner, post, and stable display position. */
export function buildPostMediaPath(
  authUserId: string,
  postId: string,
  position: number,
  objectId: string,
  extension: string,
): string {
  return storageObjectKey([
    authUserId,
    "posts",
    postId,
    `${position}-${objectId}.${extension}`,
  ]);
}

/** Story media is one immutable, owner-namespaced object per story ID. */
export function buildStoryMediaPath(
  authUserId: string,
  storyId: string,
  extension: string,
): string {
  return storageObjectKey([authUserId, "stories", `${storyId}.${extension}`]);
}

/** Extracts the owner segment so storage policies can be documented and tested. */
export function storagePathOwner(path: string): string | null {
  return storageObjectKey([path]).split("/")[0] ?? null;
}
