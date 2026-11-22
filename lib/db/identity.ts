import "server-only";
import {
  ConfigurationError,
  DatabaseError,
  ValidationError,
  isUsernameConflict,
} from "@/lib/errors";
import { getDb } from "@/lib/db";
import {
  buildInitializeUserStatement,
  initializeUserInputSchema,
  type InitializeUserInput,
} from "@/lib/db/identity-sql";
import { findUserByUsername } from "@/lib/db/users";
import { logServerError } from "@/lib/logging";
import { usernameSchema } from "@/lib/validations/auth";

export interface InitializedIdentity {
  userId: string;
  profileId: string | null;
}

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    return Array.isArray(rows) ? (rows as T[]) : [];
  }
  return [];
}

/**
 * Idempotently creates the user + profile pair. Safe to retry: an existing
 * `auth_user_id` reuses its row, and an existing profile is left untouched.
 */
export async function initializeAppUser(
  input: InitializeUserInput,
): Promise<InitializedIdentity> {
  const parsed = initializeUserInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new ValidationError("Please check your account details.");
  }

  let db;
  try {
    db = getDb();
  } catch {
    throw new ConfigurationError(
      "The database is not configured. Set DATABASE_URL in .env.local.",
    );
  }

  try {
    const result = await db.execute<{ user_id: string; profile_id: string | null }>(
      buildInitializeUserStatement(parsed.data),
    );
    const row = extractRows<{ user_id: string; profile_id: string | null }>(result)[0];

    if (!row?.user_id) {
      throw new DatabaseError();
    }

    return { userId: row.user_id, profileId: row.profile_id ?? null };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof ConfigurationError) {
      throw error;
    }
    if (isUsernameConflict(error)) {
      throw new ValidationError("That username is already taken. Please choose another.");
    }
    logServerError("db.initializeAppUser", error, {
      authUserId: parsed.data.authUserId,
      username: parsed.data.username,
    });
    throw new DatabaseError();
  }
}

/** Availability check used before asking Supabase to create an account. */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const parsed = usernameSchema.safeParse(username);
  if (!parsed.success) return false;

  try {
    const existing = await findUserByUsername(parsed.data);
    return existing === null;
  } catch (error) {
    logServerError("db.isUsernameAvailable", error);
    throw new DatabaseError();
  }
}
