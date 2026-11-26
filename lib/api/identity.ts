import "server-only";
import { getCurrentProfile, type CurrentProfile } from "@/lib/auth/dal";
import { logServerError } from "@/lib/logging";

/** Shared identity lookup for cookie-authenticated JSON endpoints. */
export async function getApiProfile(scope: string): Promise<CurrentProfile | null> {
  try {
    return await getCurrentProfile();
  } catch (error) {
    logServerError(scope, error);
    return null;
  }
}
