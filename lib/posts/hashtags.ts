/** Pure caption/hashtag helpers shared by post creation, editing, and tests. */

export const MAX_HASHTAGS = 10;

/**
 * Extracts normalized hashtags from a caption. Only ASCII letters, digits,
 * and underscores are accepted; duplicates are removed in first-seen order.
 */
export function extractHashtags(caption: string): string[] {
  const tags = new Set<string>();
  const pattern = /(^|[\s(])#([a-z0-9_]{1,30})(?=$|[\s.,!?);:])/gi;

  for (const match of caption.matchAll(pattern)) {
    const tag = match[2]?.toLowerCase();
    if (tag && tags.size < MAX_HASHTAGS) tags.add(tag);
  }

  return [...tags];
}

/** Renders caption hashtags as safe display labels without inventing links. */
export function hashtagLabel(tag: string): string {
  return `#${tag.replace(/^#/, "").toLowerCase()}`;
}
