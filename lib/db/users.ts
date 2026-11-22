import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { profiles, users } from "@/lib/db/schema";

export async function findUserByUsername(username: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return rows[0] ?? null;
}

export async function findUserByAuthUserId(authUserId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.authUserId, authUserId))
    .limit(1);
  return rows[0] ?? null;
}

/** Joins the server-derived Supabase identity to its application profile. */
export async function getAppUserWithProfile(authUserId: string) {
  const db = getDb();
  const rows = await db
    .select({ user: users, profile: profiles })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.authUserId, authUserId))
    .limit(1);
  return rows[0] ?? null;
}
