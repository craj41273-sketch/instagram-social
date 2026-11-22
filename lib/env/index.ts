import { z } from "zod";

/**
 * Variables that are safe to expose to the browser. Next.js only inlines
 * `NEXT_PUBLIC_*` variables that are referenced directly in source code.
 */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

/** The minimum configuration needed by the Supabase browser/SSR clients. */
export const supabasePublicEnvSchema = z.object({
  url: z.url(),
  anonKey: z.string().min(1),
});

export type SupabasePublicEnv = z.infer<typeof supabasePublicEnvSchema>;

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `- ${issue.path.join(".") || "root"}: ${issue.message}`)
    .join("\n");
}

/** Reads and validates browser-safe environment variables on demand. */
export function getPublicEnv(): PublicEnv {
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!result.success) {
    throw new Error(
      `Invalid public environment variables. Copy .env.example to .env.local and fill in the values.\n${formatIssues(result.error)}`,
    );
  }

  return result.data;
}

/** Reads only the Supabase values required by the public auth clients. */
export function getSupabasePublicEnv(): SupabasePublicEnv {
  const result = supabasePublicEnvSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!result.success) {
    throw new Error(
      `Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.\n${formatIssues(result.error)}`,
    );
  }

  return result.data;
}

/**
 * Non-throwing variant used by Proxy so an unconfigured app can still serve
 * its public pages instead of failing every request.
 */
export function getOptionalSupabasePublicEnv(): SupabasePublicEnv | null {
  const result = supabasePublicEnvSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  return result.success ? result.data : null;
}

/** Non-throwing check used to describe configuration state in diagnostics. */
export function isSupabasePublicEnvConfigured(): boolean {
  return getOptionalSupabasePublicEnv() !== null;
}
