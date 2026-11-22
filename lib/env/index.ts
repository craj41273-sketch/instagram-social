import { z } from "zod";

/**
 * Variables that are safe to expose to the browser. Next.js only inlines
 * `NEXT_PUBLIC_*` variables that are referenced directly in source code.
 */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: z.string().min(1).default("public"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

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
    NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET:
      process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET,
  });

  if (!result.success) {
    throw new Error(
      `Invalid public environment variables. Copy .env.example to .env.local and fill in the values.\n${formatIssues(result.error)}`,
    );
  }

  return result.data;
}
