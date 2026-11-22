import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { LOGIN_ROUTE } from "@/lib/auth/constants";
import { getAppUserWithProfile } from "@/lib/db/users";
import { logServerError } from "@/lib/logging";
import type { Profile, User } from "@/lib/db/schema";

/** Narrow, safe projection of the authenticated Supabase user. */
export interface CurrentUser {
  authUserId: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  usernameHint: string | null;
}

/** Reads the verified session; never trusts a client-provided user ID. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) return null;

    const metadata = data.user.user_metadata ?? {};

    return {
      authUserId: data.user.id,
      email: data.user.email ?? "",
      emailVerified: Boolean(data.user.email_confirmed_at),
      displayName:
        typeof metadata.display_name === "string" ? metadata.display_name : null,
      usernameHint: typeof metadata.username === "string" ? metadata.username : null,
    };
  } catch (error) {
    logServerError("auth.getCurrentUser", error);
    return null;
  }
});

/** Use in protected Server Components and authenticated route handlers. */
export async function requireAuthenticatedUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(LOGIN_ROUTE);
  return user;
}

export interface CurrentProfile {
  user: User;
  profile: Profile;
}

/** Looks up the Neon user/profile pair for the server-derived identity. */
export const getCurrentProfile = cache(
  async (): Promise<CurrentProfile | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    try {
      const record = await getAppUserWithProfile(user.authUserId);
      if (!record?.profile) return null;
      return { user: record.user, profile: record.profile };
    } catch (error) {
      logServerError("auth.getCurrentProfile", error, {
        authUserId: user.authUserId,
      });
      return null;
    }
  },
);

/** Fails closed for future authenticated features. */
export async function requireProfile(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect(`${LOGIN_ROUTE}?setup=retry`);
  return profile;
}
