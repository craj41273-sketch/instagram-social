import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  getSupabaseServerEnv,
  getSupabaseServiceEnv,
} from "@/lib/env/server";

/**
 * Creates a Supabase client bound to the current request's cookies. `getUser`
 * validates the token with Supabase and refreshes it when needed; cookie
 * writes are propagated through `setAll`.
 */
export async function createSupabaseServerClient() {
  const { url, anonKey } = getSupabaseServerEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. Cookie writes from token
          // refresh are handled by proxy.ts on the next request.
        }
      },
    },
  });
}

/**
 * Server-only admin client. Bypasses row level security; use sparingly and
 * never expose its key to the browser.
 */
export function createSupabaseAdminClient() {
  const { url, SUPABASE_SERVICE_ROLE_KEY } = getSupabaseServiceEnv();

  return createClient(url, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
