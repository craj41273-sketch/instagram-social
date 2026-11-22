import { cacheLife } from "next/cache";

/**
 * Cached so the current year can be included in the prerendered shell without
 * using an unstable `new Date()` value during rendering.
 */
export async function getCurrentYear(): Promise<number> {
  "use cache";
  cacheLife("days");

  return new Date().getFullYear();
}
