/** Pure same-origin check for cookie-authenticated write endpoints. */

/**
 * Route Handlers do not get the Server Action CSRF check automatically. Browsers
 * send `Origin` on same-origin POSTs, so require it to match the request URL and
 * reject silent cross-site submissions.
 */
export function isSameOriginPost(
  originHeader: string | null | undefined,
  requestOrigin: string,
): boolean {
  if (!originHeader) return false;

  try {
    return new URL(originHeader).origin === new URL(requestOrigin).origin;
  } catch {
    return false;
  }
}
