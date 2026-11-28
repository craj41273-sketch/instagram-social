import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_ONLY_ROUTES,
  AUTHENTICATED_HOME,
  LOGIN_ROUTE,
  isProtectedRoute,
} from "@/lib/auth/constants";
import { getOptionalSupabasePublicEnv } from "@/lib/env";

const CONTENT_SECURITY_POLICY_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy-Report-Only": CONTENT_SECURITY_POLICY_REPORT_ONLY,
};

function withSecurityHeaders(response: NextResponse): NextResponse {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}

/**
 * Next.js 16 renamed `middleware` to `proxy`. This runs before routes render
 * and provides optimistic session refresh plus public/auth-only redirects.
 * It is NOT the authorization boundary: actions and the DAL check the server
 * session again (see docs/BACKEND.md).
 */
export async function proxy(request: NextRequest) {
  const config = getOptionalSupabasePublicEnv();

  // Public pages must keep working when Supabase has not been configured.
  if (!config) return withSecurityHeaders(NextResponse.next());

  let response = NextResponse.next({ request });

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser validates the JWT with Supabase and refreshes it when needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user && isProtectedRoute(path)) {
    const url = new URL(LOGIN_ROUTE, request.url);
    url.searchParams.set("next", path);
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  if (user && AUTH_ONLY_ROUTES.some((route) => path === route)) {
    return withSecurityHeaders(
      NextResponse.redirect(new URL(AUTHENTICATED_HOME, request.url)),
    );
  }

  return withSecurityHeaders(response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)",
  ],
};
