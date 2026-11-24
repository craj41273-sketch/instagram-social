import "server-only";
import { createSupabaseServerClient } from "@/lib/auth/server";

/**
 * Planned storage buckets. These are names only — no bucket is created or
 * made public in this block. Uploads arrive with the features that need them.
 */
export const STORAGE_BUCKETS = {
  AVATARS: "avatars",
  POST_MEDIA: "post-media",
  STORIES: "stories",
  MESSAGE_ATTACHMENTS: "message-attachments",
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

/** Exposes the storage boundary without performing any upload or download. */
export async function createSupabaseStorageClient() {
  const supabase = await createSupabaseServerClient();
  return supabase.storage;
}

export { storageObjectKey } from "@/lib/storage/paths";
