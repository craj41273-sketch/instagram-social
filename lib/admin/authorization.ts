import "server-only";
import { redirect } from "next/navigation";
import { getActiveProfile } from "@/lib/auth/dal";
import { AUTHENTICATED_HOME, LOGIN_ROUTE } from "@/lib/auth/constants";
import { AuthenticationError, AuthorizationError } from "@/lib/errors";

export interface StaffContext {
  userId: string;
  username: string;
  role: "user" | "moderator" | "admin";
}

/** Derives staff authority from the verified session and Neon role only. */
export async function getStaffContext(): Promise<StaffContext | null> {
  const current = await getActiveProfile();
  if (!current) return null;

  return {
    userId: current.user.id,
    username: current.user.username,
    role: current.user.role as StaffContext["role"],
  };
}

/** Use in server actions; throws safe errors so callers can render feedback. */
export async function requireStaff(adminOnly = false): Promise<StaffContext> {
  const staff = await getStaffContext();
  if (!staff) throw new AuthenticationError("Sign in to continue.");
  const allowed = adminOnly ? staff.role === "admin" : staff.role !== "user";
  if (!allowed) throw new AuthorizationError();
  return staff;
}

/** Use in admin pages; redirects so prerendering never exposes a staff error. */
export async function requireStaffPage(adminOnly = false): Promise<StaffContext> {
  const staff = await getStaffContext();
  if (!staff) redirect(LOGIN_ROUTE);
  const allowed = adminOnly ? staff.role === "admin" : staff.role !== "user";
  if (!allowed) redirect(AUTHENTICATED_HOME);
  return staff;
}

export function isAdmin(staff: StaffContext | null): boolean {
  return staff?.role === "admin";
}
