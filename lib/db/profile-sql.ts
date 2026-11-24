import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { ProfileImageKind } from "@/lib/storage/paths";
import { editProfileSchema, type EditProfileValues } from "@/lib/validations/profile";

/**
 * Profile updates touch both tables because `users.username` is authoritative.
 * The CTE makes the username and profile changes one atomic statement; every
 * value is parameterized and all identifiers are fixed schema constants.
 */
export const updateProfileInputSchema = editProfileSchema;

export type UpdateProfileInput = EditProfileValues;

function nullable(value: string): string | null {
  return value.length === 0 ? null : value;
}

export function buildUpdateProfileStatement(
  userId: string,
  input: UpdateProfileInput,
): SQL {
  return sql`
    WITH updated_user AS (
      UPDATE "users"
      SET "username" = ${input.username}, "updated_at" = now()
      WHERE "id" = ${userId}
      RETURNING "id", "username"
    )
    UPDATE "profiles" AS p
    SET
      "display_name" = ${input.displayName},
      "bio" = ${nullable(input.bio)},
      "website" = ${nullable(input.website)},
      "location" = ${nullable(input.location)},
      "updated_at" = now()
    FROM "updated_user" AS u
    WHERE p."user_id" = u."id"
    RETURNING p."id" AS profile_id, p."user_id" AS user_id, u."username" AS username
  `;
}

/** Updates only the selected image column using a fixed, trusted identifier. */
export function buildUpdateProfileImageStatement(
  userId: string,
  kind: ProfileImageKind,
  url: string,
): SQL {
  const column = kind === "avatar" ? sql`"avatar_url"` : sql`"cover_url"`;

  return sql`
    UPDATE "profiles"
    SET ${column} = ${url}, "updated_at" = now()
    WHERE "user_id" = ${userId}
    RETURNING "id" AS profile_id, "user_id" AS user_id
  `;
}

/** Rejects client-supplied IDs before they ever reach a parameterized query. */
export function parseUserId(value: string): string | null {
  const result = z.uuid().safeParse(value);
  return result.success ? result.data : null;
}
