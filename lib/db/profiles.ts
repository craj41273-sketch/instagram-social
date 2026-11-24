import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { profiles, users } from "@/lib/db/schema";
import {
  buildUpdateProfileImageStatement,
  buildUpdateProfileStatement,
  parseUserId,
  updateProfileInputSchema,
  type UpdateProfileInput,
} from "@/lib/db/profile-sql";
import type { ProfileImageKind } from "@/lib/storage/paths";
import {
  DatabaseError,
  ValidationError,
  isUsernameConflict,
} from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import { usernameSchema } from "@/lib/validations/auth";

/** Safe projection for public profile rendering; never includes email/auth IDs. */
export interface PublicProfile {
  userId: string;
  profileId: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  website: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatedProfile {
  username: string;
  displayName: string;
  bio: string | null;
  website: string | null;
  location: string | null;
}

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    return Array.isArray(rows) ? (rows as T[]) : [];
  }
  return [];
}

function toPublicProfile(row: {
  user_id: string;
  profile_id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  website: string | null;
  location: string | null;
  created_at: Date;
  updated_at: Date;
}): PublicProfile {
  return {
    userId: row.user_id,
    profileId: row.profile_id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    coverUrl: row.cover_url,
    website: row.website,
    location: row.location,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

const publicColumns = {
  user_id: users.id,
  profile_id: profiles.id,
  username: users.username,
  display_name: profiles.displayName,
  bio: profiles.bio,
  avatar_url: profiles.avatarUrl,
  cover_url: profiles.coverUrl,
  website: profiles.website,
  location: profiles.location,
  created_at: users.createdAt,
  updated_at: profiles.updatedAt,
} as const;

export async function findProfileByUserId(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

/** Public profile lookup by the authoritative, normalized username. */
export async function getPublicProfileByUsername(
  username: string,
): Promise<PublicProfile | null> {
  const parsed = usernameSchema.safeParse(username);
  if (!parsed.success) return null;

  try {
    const rows = await getDb()
      .select(publicColumns)
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.username, parsed.data))
      .limit(1);
    return rows[0] ? toPublicProfile(rows[0]) : null;
  } catch (error) {
    logServerError("db.getPublicProfileByUsername", error, {
      username: parsed.data,
    });
    throw new DatabaseError();
  }
}

/** Safe profile lookup by application user ID (used by ownership checks). */
export async function getPublicProfileByUserId(
  userId: string,
): Promise<PublicProfile | null> {
  if (!parseUserId(userId)) return null;

  try {
    const rows = await getDb()
      .select(publicColumns)
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);
    return rows[0] ? toPublicProfile(rows[0]) : null;
  } catch (error) {
    logServerError("db.getPublicProfileByUserId", error, { userId });
    throw new DatabaseError();
  }
}

/** Availability check for edits; excludes the owner's own unchanged username. */
export async function isUsernameAvailableForUser(
  username: string,
  excludeUserId?: string,
): Promise<boolean> {
  const parsed = usernameSchema.safeParse(username);
  if (!parsed.success) return false;

  try {
    const condition = excludeUserId
      ? and(eq(users.username, parsed.data), ne(users.id, excludeUserId))
      : eq(users.username, parsed.data);

    const rows = await getDb()
      .select({ id: users.id })
      .from(users)
      .where(condition)
      .limit(1);
    return rows.length === 0;
  } catch (error) {
    logServerError("db.isUsernameAvailableForUser", error, {
      username: parsed.data,
    });
    throw new DatabaseError();
  }
}

/**
 * Updates only the authenticated owner's row. `userId` is supplied by the DAL,
 * never by the request; the SQL statement includes both tables atomically.
 */
export async function updateOwnProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<UpdatedProfile> {
  const parsedUserId = parseUserId(userId);
  if (!parsedUserId) throw new ValidationError("Invalid account identity.");

  const parsedInput = updateProfileInputSchema.safeParse(input);
  if (!parsedInput.success) throw new ValidationError("Please check your profile details.");

  try {
    const result = await getDb().execute<{
      profile_id: string;
      user_id: string;
      username: string;
    }>(buildUpdateProfileStatement(parsedUserId, parsedInput.data));
    const row = extractRows<{ profile_id: string; user_id: string; username: string }>(
      result,
    )[0];

    if (!row?.profile_id || row.user_id !== parsedUserId) {
      throw new DatabaseError("We could not update your profile. Please try again.");
    }

    return {
      username: row.username,
      displayName: parsedInput.data.displayName,
      bio: parsedInput.data.bio.length > 0 ? parsedInput.data.bio : null,
      website: parsedInput.data.website.length > 0 ? parsedInput.data.website : null,
      location: parsedInput.data.location.length > 0 ? parsedInput.data.location : null,
    };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof DatabaseError) throw error;
    if (isUsernameConflict(error)) {
      throw new ValidationError("That username is already taken. Please choose another.");
    }
    logServerError("db.updateOwnProfile", error, { userId: parsedUserId });
    throw new DatabaseError();
  }
}

/** Persists a storage URL for the authenticated owner's avatar or cover. */
export async function updateProfileImage(
  userId: string,
  kind: ProfileImageKind,
  url: string,
): Promise<void> {
  const parsedUserId = parseUserId(userId);
  if (!parsedUserId) throw new ValidationError("Invalid account identity.");

  try {
    const result = await getDb().execute<{ profile_id: string; user_id: string }>(
      buildUpdateProfileImageStatement(parsedUserId, kind, url),
    );
    const row = extractRows<{ profile_id: string; user_id: string }>(result)[0];
    if (!row?.profile_id || row.user_id !== parsedUserId) {
      throw new DatabaseError("We could not save that image. Please try again.");
    }
  } catch (error) {
    if (error instanceof ValidationError || error instanceof DatabaseError) throw error;
    logServerError("db.updateProfileImage", error, { userId: parsedUserId, kind });
    throw new DatabaseError();
  }
}
