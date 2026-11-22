import { NextResponse, type NextRequest } from "next/server";
import {
  AUTHENTICATED_HOME,
  RESET_PASSWORD_ROUTE,
  VERIFY_EMAIL_ROUTE,
} from "@/lib/auth/constants";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { logServerError } from "@/lib/logging";
import { safeRedirectPath } from "@/lib/security/redirects";

/** Subset of Supabase OTP types accepted by this endpoint. */
type ConfirmableOtpType =
  | "email"
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change";

/** Allowlist prevents arbitrary OTP types from being verified. */
const ALLOWED_TYPES = new Set<ConfirmableOtpType>([
  "email",
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
]);

/** Handles Supabase email templates that use `token_hash` confirmation URLs. */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const rawType = request.nextUrl.searchParams.get("type");
  const fallback = rawType === "recovery" ? RESET_PASSWORD_ROUTE : VERIFY_EMAIL_ROUTE;
  const next = safeRedirectPath(request.nextUrl.searchParams.get("next"), fallback);

  if (!tokenHash || !rawType || !ALLOWED_TYPES.has(rawType as ConfirmableOtpType)) {
    return NextResponse.redirect(new URL(VERIFY_EMAIL_ROUTE, request.url));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: rawType as ConfirmableOtpType,
    });

    if (error) {
      logServerError("auth.confirm", error);
      return NextResponse.redirect(new URL(VERIFY_EMAIL_ROUTE, request.url));
    }
  } catch (error) {
    logServerError("auth.confirmClient", error);
    return NextResponse.redirect(new URL(VERIFY_EMAIL_ROUTE, request.url));
  }

  return NextResponse.redirect(new URL(next ?? AUTHENTICATED_HOME, request.url));
}
