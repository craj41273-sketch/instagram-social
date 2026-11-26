/** Client-safe presentation helpers for Block 10 DTOs. */

/** Compact relative time without fabricated precision. */
export function relativeTime(iso: string): string {
  const elapsed = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return "now";
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d` : new Date(iso).toLocaleDateString();
}

/** Bounded badge label; the full count remains in the accessible name. */
export function badgeCount(count: number): string {
  return count > 9 ? "9+" : String(count);
}
