import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_ONLY_ROUTES,
  AUTHENTICATED_HOME,
  LOGIN_ROUTE,
  isProtectedRoute,
} from "@/lib/auth/constants";
import { getOptionalSupabasePublicEnv } from "@/lib/env";

/**
 * Next.js 16 renamed `middleware` to `proxy`. This runs before routes render
 * and provides optimistic session refresh plus public/auth-only redirects.
 * It is NOT the authorization boundary: actions and the DAL check the server
 * session again (see docs/BACKEND.md).
 */
export async function proxy(request: NextRequest) {
  const config = getOptionalSupabasePublicEnv();

  // Public pages must keep working when Supabase has not been configured.
  if (!config) return NextResponse.next();

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
    return NextResponse.redirect(url);
  }

  if (user && AUTH_ONLY_ROUTES.some((route) => path === route)) {
    return NextResponse.redirect(new URL(AUTHENTICATED_HOME, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)",
  ],
};
