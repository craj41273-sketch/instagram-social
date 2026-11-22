import "server-only";
import { z } from "zod";
import {
  publicEnvSchema,
  supabasePublicEnvSchema,
  type SupabasePublicEnv,
} from "@/lib/env";

/** Variables that must never be bundled into client JavaScript. */
const serverEnvSchema = publicEnvSchema.extend({
  DATABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type DatabaseEnv = { DATABASE_URL: string };
export type SupabaseServiceEnv = SupabasePublicEnv & {
  SUPABASE_SERVICE_ROLE_KEY: string;
};

function parseOrThrow<T extends z.ZodType>(
  schema: T,
  values: Record<string, unknown>,
  label: string,
): z.infer<T> {
  const result = schema.safeParse(values);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `- ${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Invalid ${label} environment variables. Copy .env.example to .env.local and fill in the values.\n${details}`,
    );
  }

  return result.data;
}

/** Full server environment; prefer the narrower getters below where possible. */
export function getServerEnv(): ServerEnv {
  return parseOrThrow(
    serverEnvSchema,
    {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      DATABASE_URL: process.env.DATABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    "server",
  );
}

/** Neon connection settings, isolated so auth-only actions can still run. */
export function getDatabaseEnv(): DatabaseEnv {
  return parseOrThrow(
    z.object({ DATABASE_URL: z.url() }),
    { DATABASE_URL: process.env.DATABASE_URL },
    "database",
  );
}

/** Public Supabase values needed by the request-scoped auth client. */
export function getSupabaseServerEnv(): SupabasePublicEnv {
  return parseOrThrow(
    supabasePublicEnvSchema,
    {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    "Supabase server",
  );
}

/** Service-role configuration for tightly scoped administrative operations. */
export function getSupabaseServiceEnv(): SupabaseServiceEnv {
  return parseOrThrow(
    supabasePublicEnvSchema.extend({
      SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    }),
    {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    "Supabase service",
  );
}
