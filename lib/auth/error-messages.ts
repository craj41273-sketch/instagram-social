/**
 * Supabase/PostgREST errors are logged server-side but never forwarded
 * verbatim to the browser. Only these curated messages are user-visible.
 */
const MATCHERS: Array<{ test: RegExp; message: string }> = [
  {
    test: /invalid login credentials|invalid email or password/i,
    message: "Email or password is incorrect. Please try again.",
  },
  {
    test: /email not confirmed|unverified/i,
    message: "Please verify your email address before logging in.",
  },
  {
    test: /user already registered|already exists/i,
    message: "An account with this email may already exist. Try logging in instead.",
  },
  {
    test: /password should be at least|weak password/i,
    message: "Please choose a stronger password.",
  },
  {
    test: /only request this after|rate limit|too many requests/i,
    message: "Too many attempts. Please wait a moment before trying again.",
  },
  {
    test: /expired|invalid.*(token|link|otp)|otp.*(expired|invalid)/i,
    message: "This link has expired or is invalid. Request a new one.",
  },
];

const FALLBACKS: Record<string, string> = {
  signup: "We could not create your account. Please try again.",
  login: "We could not sign you in. Please try again.",
  recovery: "We could not send a recovery email. Please try again.",
  reset: "We could not update your password. Please try again.",
  verification: "We could not verify your email. Please try again.",
};

export type AuthFlow = keyof typeof FALLBACKS;

/** Maps an unknown error from an auth SDK call to a safe user message. */
export function mapAuthError(error: unknown, flow: AuthFlow): string {
  const raw =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message)
      : "";

  for (const matcher of MATCHERS) {
    if (matcher.test.test(raw)) return matcher.message;
  }

  return FALLBACKS[flow] ?? "We could not complete the request. Please try again.";
}
