import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  AuthenticationError,
  DatabaseError,
  ValidationError,
} from "@/lib/errors";
import { initializeAppUser, isUsernameAvailable } from "@/lib/db/identity";
import { findUserByAuthUserId } from "@/lib/db/users";
import { logServerError, logServerWarning } from "@/lib/logging";
import { usernameSchema } from "@/lib/validations/auth";

/** The subset of a Supabase Auth user this layer is allowed to consume. */
export interface AuthenticatedIdentity {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}

const UUID = z.uuid();

function metadataString(
  metadata: Record<string, unknown> | undefined,
  key: string,
): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function deriveUsername(email: string | null | undefined): string {
  const base = (email ?? "")
    .split("@")[0]
    ?.toLowerCase()
    .replace(/[^a-z0-9._]/g, ".")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 12);
  const candidate = base && base.length >= 3 ? base : "luma.user";
  return candidate.slice(0, 14);
}

async function availableUsername(preferred: string): Promise<string> {
  const parsed = usernameSchema.safeParse(preferred);
  const base = parsed.success ? parsed.data : deriveUsername(preferred);

  if (await isUsernameAvailable(base)) return base;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const suffix = randomUUID().slice(0, 6);
    const candidate = `${base.slice(0, 14)}${suffix}`;
    if (await isUsernameAvailable(candidate)) return candidate;
  }

  throw new ValidationError("We could not reserve a unique username for your account.");
}

/**
 * Recovery path for an auth success whose Neon writes failed. The auth user ID
 * always comes from the verified Supabase session — never from the client.
 */
export async function ensureAppUserForAuthenticatedUser(
  identity: AuthenticatedIdentity,
): Promise<void> {
  if (!UUID.safeParse(identity.id).success) {
    throw new AuthenticationError("We could not verify your account identity.");
  }

  try {
    const existing = await findUserByAuthUserId(identity.id);
    const metadataUsername = metadataString(identity.user_metadata, "username");

    // An existing app user already owns its username; do not re-check it.
    const username = existing
      ? existing.username
      : await availableUsername(metadataUsername ?? deriveUsername(identity.email));
    const metadataDisplayName = metadataString(identity.user_metadata, "display_name");
    const displayName = metadataDisplayName ?? username;
    const email = identity.email ?? existing?.email;

    if (!email) {
      throw new ValidationError("Your account is missing an email address.");
    }

    await initializeAppUser({
      authUserId: identity.id,
      email,
      username,
      displayName,
    });
  } catch (error) {
    if (
      error instanceof AuthenticationError ||
      error instanceof ValidationError ||
      error instanceof DatabaseError
    ) {
      throw error;
    }
    logServerError("auth.ensureAppUser", error, { authUserId: identity.id });
    throw new DatabaseError();
  }
}

/** Logs an incomplete registration without leaking credentials or tokens. */
export function logIncompleteRegistration(
  authUserId: string,
  reason: string,
): void {
  logServerWarning("auth.incompleteRegistration", reason, { authUserId });
}
