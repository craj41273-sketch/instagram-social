/** Shared auth route constants used by Proxy, actions, and documentation. */

/** Where a newly authenticated user lands until the app shell exists. */
export const AUTHENTICATED_HOME = "/";

/** Public pages that authenticated visitors should not see. */
export const AUTH_ONLY_ROUTES = ["/login", "/signup"] as const;

/**
 * Optimistic proxy protection. Public `/profile/[username]` pages intentionally
 * stay open; authoritative ownership checks still live in the DAL/actions.
 */
export const PROTECTED_ROUTE_PREFIXES: readonly string[] = [
  "/profile/edit",
  "/settings",
  "/appeals",
  "/report",
  "/admin",
];

/**
 * Exact-or-child matching prevents `/profile/editor` from being mistaken for
 * the `/profile/edit` settings route.
 */
export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const LOGIN_ROUTE = "/login";
export const SIGNUP_ROUTE = "/signup";
export const VERIFY_EMAIL_ROUTE = "/verify-email";
export const FORGOT_PASSWORD_ROUTE = "/forgot-password";
export const RESET_PASSWORD_ROUTE = "/reset-password";
export const AUTH_CALLBACK_ROUTE = "/auth/callback";
export const AUTH_CONFIRM_ROUTE = "/auth/confirm";
