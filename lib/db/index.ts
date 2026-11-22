import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getServerEnv } from "@/lib/env/server";
import * as schema from "@/lib/db/schema";

function createDb() {
  const { DATABASE_URL } = getServerEnv();
  const client = neon(DATABASE_URL);

  return drizzle(client, { schema });
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
