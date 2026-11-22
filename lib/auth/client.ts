"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "@/lib/env";

/** Creates a Supabase client for use in Client Components. */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabasePublicEnv();

  return createBrowserClient(url, anonKey);
}
