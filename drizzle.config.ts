import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * `generate` only reads the schema, so a placeholder URL is sufficient.
 * Commands that connect (migrate, push, studio) require a real DATABASE_URL.
 */
const isGenerate = process.argv.includes("generate");
const databaseUrl =
  process.env.DATABASE_URL ??
  (isGenerate
    ? "postgresql://placeholder:placeholder@localhost:5432/placeholder"
    : "");

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required. Copy .env.example to .env.local.");
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
