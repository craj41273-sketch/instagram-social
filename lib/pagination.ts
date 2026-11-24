import { z } from "zod";

/** Shared, bounded pagination helpers for social graph lists. */

export const LIST_PAGE_SIZE = 12;
export const MAX_LIST_PAGE_SIZE = 24;

const cursorSchema = z.object({
  createdAt: z.iso.datetime(),
  id: z.uuid(),
});

export interface FollowCursor {
  createdAt: string;
  id: string;
}

/** Opaque, URL-safe cursor built from the last row's stable sort keys. */
export function encodeFollowCursor(cursor: FollowCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

/** Invalid cursors are ignored rather than trusted or surfaced as errors. */
export function decodeFollowCursor(value: string | undefined | null): FollowCursor | null {
  if (!value || value.length > 512) return null;

  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    );
    const result = cursorSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/** Generic aliases keep feed/profile cursors distinct from follow semantics. */
export type PageCursor = FollowCursor;
export const encodePageCursor = encodeFollowCursor;
export const decodePageCursor = decodeFollowCursor;

/** Query-string values are untrusted; keep page size predictable. */
export function parseListLimit(value: unknown): number {
  const parsed = z.coerce.number().int().min(1).max(MAX_LIST_PAGE_SIZE).safeParse(value);
  return parsed.success ? parsed.data : LIST_PAGE_SIZE;
}
