/** Pure display helpers for post timestamps and captions. */

/** Stable UTC label; the database timestamp remains the source of truth. */
export function formatPostTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return `${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })} · ${date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  })} UTC`;
}

/** Renders only normalized hashtags; all other caption text is plain. */
export function captionParts(caption: string): Array<{ text: string; tag: string | null }> {
  return caption
    .split(/(#[a-z0-9_]{1,30})/gi)
    .filter(Boolean)
    .map((text) => ({
      text,
      tag: /^#[a-z0-9_]{1,30}$/i.test(text)
        ? text.slice(1).toLowerCase()
        : null,
    }));
}
