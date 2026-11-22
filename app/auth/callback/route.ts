import { NextResponse, type NextRequest } from "next/server";
import { AUTHENTICATED_HOME, LOGIN_ROUTE } from "@/lib/auth/constants";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { logServerError } from "@/lib/logging";
import { safeRedirectPath } from "@/lib/security/redirects";

/** Exchanges a Supabase PKCE code for a cookie-backed session. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeRedirectPath(
    request.nextUrl.searchParams.get("next"),
    AUTHENTICATED_HOME,
  );

  if (!code) {
    return NextResponse.redirect(new URL(LOGIN_ROUTE, request.url));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      logServerError("auth.callback", error);
      return NextResponse.redirect(new URL(LOGIN_ROUTE, request.url));
    }
  } catch (error) {
    logServerError("auth.callbackClient", error);
    return NextResponse.redirect(new URL(LOGIN_ROUTE, request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
