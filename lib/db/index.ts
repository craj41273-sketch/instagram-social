import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { ConfigurationError } from "@/lib/errors";
import { getDatabaseEnv } from "@/lib/env/server";
import * as schema from "@/lib/db/schema";

function createDb() {
  let url: string;

  try {
    ({ DATABASE_URL: url } = getDatabaseEnv());
  } catch {
    // Never include the raw environment value in the thrown message.
    throw new ConfigurationError(
      "The database is not configured. Set DATABASE_URL in .env.local.",
    );
  }

  try {
    const client = neon(url);
    return drizzle(client, { schema });
  } catch {
    throw new ConfigurationError("The database client could not be created.");
  }
}

export type Database = ReturnType<typeof createDb>;

let database: Database | undefined;

/**
 * Lazily creates a cached Drizzle client so importing this module never opens
 * a connection (important for builds and server component rendering).
 */
export function getDb(): Database {
  database ??= createDb();
  return database;
}

/** Non-throwing check used by diagnostics and tests. */
export function isDatabaseConfigured(): boolean {
  try {
    getDatabaseEnv();
    return true;
  } catch {
    return false;
  }
}
