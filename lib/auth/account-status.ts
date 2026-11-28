import type { User } from "@/lib/db/schema";

/** Pure moderation guard for mutation paths; suspendedUntil is advisory only. */
export function isActiveUser(user: Pick<User, "accountStatus" | "bannedAt">): boolean {
  if (user.bannedAt) return false;
  return user.accountStatus !== "banned" && user.accountStatus !== "suspended";
}
