/**
 * Redirect destinations supplied by a URL or form are never trusted as-is.
 * Only same-origin absolute paths are allowed, which prevents open redirects.
 */
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function safeRedirectPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return fallback;
  }
  if (CONTROL_CHARACTERS.test(trimmed)) return fallback;

  try {
    const url = new URL(trimmed, "http://local.invalid");
    if (url.origin !== "http://local.invalid") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function buildAuthRedirect(path: string, next?: unknown): string {
  const safePath = safeRedirectPath(path);
  const safeNext = safeRedirectPath(next, safePath);
  const url = new URL(safeNext, "http://local.invalid");
  url.searchParams.delete("next");
  return `${url.pathname}${url.search}${url.hash}`;
}
