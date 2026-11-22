/** Shared auth route constants used by Proxy, actions, and documentation. */

/** Where a newly authenticated user lands until the app shell exists. */
export const AUTHENTICATED_HOME = "/";

/** Public pages that authenticated visitors should not see. */
export const AUTH_ONLY_ROUTES = ["/login", "/signup"] as const;

/** Route prefixes reserved for future authenticated areas (Block 5+). */
export const PROTECTED_ROUTE_PREFIXES: readonly string[] = [];

export const LOGIN_ROUTE = "/login";
export const SIGNUP_ROUTE = "/signup";
export const VERIFY_EMAIL_ROUTE = "/verify-email";
export const FORGOT_PASSWORD_ROUTE = "/forgot-password";
export const RESET_PASSWORD_ROUTE = "/reset-password";
export const AUTH_CALLBACK_ROUTE = "/auth/callback";
export const AUTH_CONFIRM_ROUTE = "/auth/confirm";
