export { cn } from "cn";

/** Formats a date with a stable, server-safe default. */
export function formatDate(
  value: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${String(value)}`);
  }

  return new Intl.DateTimeFormat("en-US", options).format(date);
}

/** Trims text to a maximum length, appending an ellipsis when truncated. */
export function truncate(text: string, maxLength: number): string {
  if (maxLength < 1) {
    throw new Error("maxLength must be greater than zero");
  }

  return text.length <= maxLength
    ? text
    : `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
