import "server-only";
import { cache } from "react";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { trustHypes, users } from "@/lib/db/schema";
import { parseUserId } from "@/lib/db/profile-sql";
import { calculateTrustFillPercent } from "@/lib/trust/constants";
import { AuthorizationError, ValidationError } from "@/lib/errors";

export interface TrustStats {
  fillPercent: number;
  validHypes: number;
  eligibleUsers: number;
  unassessed: boolean;
  viewerHasHype: boolean;
}

/** Excludes banned/suspended/invalid accounts from both sides of the formula. */
function buildEligibleUserCondition(table: typeof users) {
  return sql`
    ${table.bannedAt} is null
    and (${table.suspendedUntil} is null or ${table.suspendedUntil} <= now())
    and ${table.accountStatus} not in ('banned', 'suspended')
  `;
}

/**
 * Community trust is recomputed from real rows on each request but memoized for
 * one React render. No admin writer and no stored percentage exist.
 */
export const getTrustStats = cache(
  async (targetUserId: string, viewerId: string | null = null): Promise<TrustStats> => {
    if (!parseUserId(targetUserId)) {
      return {
        fillPercent: 0,
        validHypes: 0,
        eligibleUsers: 0,
        unassessed: true,
        viewerHasHype: false,
      };
    }

    const result = await getDb().execute<{
      eligible_users: number | string;
      valid_hypes: number | string;
      viewer_hype: number | string;
    }>(sql`
      SELECT
        (SELECT count(*)::int FROM ${users} WHERE ${buildEligibleUserCondition(users)})
          AS eligible_users,
        (
          SELECT count(*)::int
          FROM ${trustHypes} h
          INNER JOIN ${users} g ON g.id = h.giver_id
          WHERE h.target_id = ${targetUserId}
            AND h.state = 'active'
            AND g.banned_at is null
            AND (g.suspended_until is null or g.suspended_until <= now())
            AND g.account_status not in ('banned', 'suspended')
        ) AS valid_hypes,
        (
          SELECT count(*)::int
          FROM ${trustHypes} h
          WHERE h.target_id = ${targetUserId}
            AND h.state = 'active'
            AND h.giver_id = ${viewerId ?? ""}
        ) AS viewer_hype
    `);

    const row = Array.isArray(result)
      ? result[0]
      : ((result as { rows?: Array<Record<string, number | string>> }).rows?.[0] ??
        undefined);
    const eligibleUsers = Number(row?.eligible_users ?? 0);
    const validHypes = Number(row?.valid_hypes ?? 0);
    const fillPercent = calculateTrustFillPercent(validHypes, eligibleUsers);

    return {
      fillPercent,
      validHypes,
      eligibleUsers,
      unassessed: validHypes === 0,
      viewerHasHype: Number(row?.viewer_hype ?? 0) > 0,
    };
  },
);

/** Creates or reverses one authenticated hype; one active hype per pair. */
export async function toggleTrustHype(
  giverId: string,
  targetUserId: string,
): Promise<{ active: boolean }> {
  if (!parseUserId(giverId) || !parseUserId(targetUserId)) {
    throw new ValidationError("Invalid account identity.");
  }
  if (giverId === targetUserId) {
    throw new ValidationError("You cannot hype your own account.");
  }

  const eligible = await getDb()
    .select({ id: users.id, status: users.accountStatus })
    .from(users)
    .where(and(eq(users.id, giverId), buildEligibleUserCondition(users)))
    .limit(1);
  if (eligible.length === 0) {
    throw new AuthorizationError("Only active Luma accounts can give hypes.");
  }

  const target = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, targetUserId), buildEligibleUserCondition(users)))
    .limit(1);
  if (target.length === 0) {
    throw new ValidationError("That account is not eligible for trust hypes.");
  }

  const existing = await getDb()
    .select({ id: trustHypes.id, state: trustHypes.state })
    .from(trustHypes)
    .where(
      and(eq(trustHypes.giverId, giverId), eq(trustHypes.targetId, targetUserId)),
    )
    .limit(1);

  const nextState = existing?.[0]?.state === "active" ? "withdrawn" : "active";

  if (existing[0]) {
    await getDb()
      .update(trustHypes)
      .set({ state: nextState, updatedAt: new Date() })
      .where(eq(trustHypes.id, existing[0].id));
  } else {
    await getDb()
      .insert(trustHypes)
      .values({ giverId, targetId: targetUserId, state: "active" });
  }

  return { active: nextState === "active" };
}
