import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { displayNameSchema, usernameSchema } from "../validations/auth";

/**
 * Every value in this statement is parameterized by Drizzle; the identifiers
 * are fixed schema constants. No caller-provided string is concatenated into
 * SQL, so this path is safe from SQL injection.
 */
export const initializeUserInputSchema = z.object({
  authUserId: z.uuid("Invalid Supabase identity."),
  email: z.email("Invalid email address."),
  username: usernameSchema,
  displayName: displayNameSchema,
});

export type InitializeUserInput = z.infer<typeof initializeUserInputSchema>;

/**
 * Atomically ensures both the application user and its profile exist.
 * `auth_user_id` conflicts are a successful retry: the existing row is
 * returned without creating a duplicate. A username conflict fails the whole
 * statement because both inserts happen in one statement.
 */
export function buildInitializeUserStatement(input: InitializeUserInput): SQL {
  return sql`
    WITH ensured_user AS (
      INSERT INTO users (id, auth_user_id, email, username)
      VALUES (gen_random_uuid(), ${input.authUserId}, ${input.email}, ${input.username})
      ON CONFLICT (auth_user_id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = now()
      RETURNING id
    ),
    ensured_profile AS (
      INSERT INTO profiles (id, user_id, display_name)
      SELECT gen_random_uuid(), id, ${input.displayName}
      FROM ensured_user
      ON CONFLICT (user_id) DO NOTHING
    )
    SELECT ensured_user.id AS user_id,
           (SELECT id FROM profiles WHERE user_id = ensured_user.id) AS profile_id
    FROM ensured_user
  `;
}
