import "server-only";
import { and, eq, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  closeFriends,
  conversationRequests,
  follows,
  followRequests,
  profiles,
  userRelationships,
  users,
} from "@/lib/db/schema";
import { parseUserId } from "@/lib/db/profile-sql";
import { followUser } from "@/lib/db/follows";
import {
  getPrivacyContext,
  type PrivacyContext,
} from "@/lib/privacy/service";
import {
  AuthorizationError,
  ValidationError,
} from "@/lib/errors";
import type { RELATIONSHIP_KINDS } from "@/lib/privacy/constants";

export interface RelationshipUser {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface FollowRequestUser extends RelationshipUser {
  requestId: string;
}

function validatePair(actorId: string, targetId: string): void {
  if (!parseUserId(actorId) || !parseUserId(targetId)) {
    throw new ValidationError("Invalid account identity.");
  }
  if (actorId === targetId) {
    throw new ValidationError("You cannot manage your own relationship.");
  }
}

/** Adds or removes one block/restrict/mute edge owned by the session user. */
export async function setUserRelationship(
  actorId: string,
  targetId: string,
  kind: (typeof RELATIONSHIP_KINDS)[number],
  enabled: boolean,
): Promise<void> {
  validatePair(actorId, targetId);

  if (enabled) {
    await getDb()
      .insert(userRelationships)
      .values({ actorId, targetId, kind })
      .onConflictDoNothing();
  } else {
    await getDb()
      .delete(userRelationships)
      .where(
        and(
          eq(userRelationships.actorId, actorId),
          eq(userRelationships.targetId, targetId),
          eq(userRelationships.kind, kind),
        ),
      );
  }

  // A block immediately severs bidirectional social links and pending requests.
  if (kind === "block" && enabled) {
    await getDb()
      .delete(follows)
      .where(
        or(
          and(eq(follows.followerId, actorId), eq(follows.followingId, targetId)),
          and(eq(follows.followerId, targetId), eq(follows.followingId, actorId)),
        ),
      );
    await getDb()
      .delete(followRequests)
      .where(
        or(
          and(
            eq(followRequests.requesterId, actorId),
            eq(followRequests.targetId, targetId),
          ),
          and(
            eq(followRequests.requesterId, targetId),
            eq(followRequests.targetId, actorId),
          ),
        ),
      );
    await getDb()
      .delete(conversationRequests)
      .where(
        or(
          and(
            eq(conversationRequests.senderId, actorId),
            eq(conversationRequests.recipientId, targetId),
          ),
          and(
            eq(conversationRequests.senderId, targetId),
            eq(conversationRequests.recipientId, actorId),
          ),
        ),
      );
    await getDb()
      .delete(closeFriends)
      .where(eq(closeFriends.memberId, targetId));
  }
}

export async function listRelationships(
  actorId: string,
  kind: (typeof RELATIONSHIP_KINDS)[number],
): Promise<RelationshipUser[]> {
  if (!parseUserId(actorId)) return [];
  const rows = await getDb()
    .select({
      userId: users.id,
      username: users.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      createdAt: userRelationships.createdAt,
    })
    .from(userRelationships)
    .innerJoin(users, eq(users.id, userRelationships.targetId))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(
      and(eq(userRelationships.actorId, actorId), eq(userRelationships.kind, kind)),
    )
    .orderBy(userRelationships.createdAt);

  return rows.map((row) => ({
    userId: row.userId,
    username: row.username,
    displayName: row.displayName ?? row.username,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt.toISOString(),
  }));
}

export interface FollowWithPrivacyResult {
  following: boolean;
  requested: boolean;
  alreadyFollowing: boolean;
}

/** Private targets create a request; public targets keep the existing edge flow. */
export async function followWithPrivacy(
  followerId: string,
  targetId: string,
): Promise<FollowWithPrivacyResult> {
  validatePair(followerId, targetId);
  const context: PrivacyContext = await getPrivacyContext(followerId, targetId);
  if (
    context.blockedByViewer ||
    context.blockedViewer ||
    context.targetStatus === "banned"
  ) {
    throw new AuthorizationError("You cannot follow this account.");
  }
  if (context.viewerFollowsTarget) {
    return { following: true, requested: false, alreadyFollowing: true };
  }

  if (context.settings.isPrivate) {
    await getDb()
      .insert(followRequests)
      .values({ requesterId: followerId, targetId })
      .onConflictDoUpdate({
        target: [followRequests.requesterId, followRequests.targetId],
        set: { status: "pending", updatedAt: new Date() },
      });
    return { following: false, requested: true, alreadyFollowing: false };
  }

  const result = await followUser(followerId, targetId);
  return {
    following: result.following,
    requested: false,
    alreadyFollowing: result.alreadyFollowing,
  };
}

export async function listIncomingFollowRequests(
  targetId: string,
): Promise<FollowRequestUser[]> {
  if (!parseUserId(targetId)) return [];
  const rows = await getDb()
    .select({
      requestId: followRequests.id,
      userId: users.id,
      username: users.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      createdAt: followRequests.createdAt,
    })
    .from(followRequests)
    .innerJoin(users, eq(users.id, followRequests.requesterId))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(
      and(
        eq(followRequests.targetId, targetId),
        eq(followRequests.status, "pending"),
      ),
    )
    .orderBy(followRequests.createdAt);
  return rows.map((row) => ({
    requestId: row.requestId,
    userId: row.userId,
    username: row.username,
    displayName: row.displayName ?? row.username,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function listOutgoingFollowRequests(
  requesterId: string,
): Promise<FollowRequestUser[]> {
  if (!parseUserId(requesterId)) return [];
  const rows = await getDb()
    .select({
      requestId: followRequests.id,
      userId: users.id,
      username: users.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      createdAt: followRequests.createdAt,
    })
    .from(followRequests)
    .innerJoin(users, eq(users.id, followRequests.targetId))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(
      and(
        eq(followRequests.requesterId, requesterId),
        eq(followRequests.status, "pending"),
      ),
    )
    .orderBy(followRequests.createdAt);
  return rows.map((row) => ({
    requestId: row.requestId,
    userId: row.userId,
    username: row.username,
    displayName: row.displayName ?? row.username,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt.toISOString(),
  }));
}

/** Only the request target may accept or decline. */
export async function respondToFollowRequest(
  targetId: string,
  requesterId: string,
  accept: boolean,
): Promise<void> {
  validatePair(targetId, requesterId);
  const rows = await getDb()
    .select({ id: followRequests.id })
    .from(followRequests)
    .where(
      and(
        eq(followRequests.requesterId, requesterId),
        eq(followRequests.targetId, targetId),
        eq(followRequests.status, "pending"),
      ),
    )
    .limit(1);
  const request = rows[0];
  if (!request) throw new AuthorizationError();

  const context = await getPrivacyContext(requesterId, targetId);
  if (context.blockedByViewer || context.blockedViewer) {
    throw new AuthorizationError();
  }

  await getDb()
    .update(followRequests)
    .set({ status: accept ? "accepted" : "declined", updatedAt: new Date() })
    .where(eq(followRequests.id, request.id));

  if (accept) await followUser(requesterId, targetId);
}

export async function cancelFollowRequest(
  requesterId: string,
  targetId: string,
): Promise<void> {
  validatePair(requesterId, targetId);
  await getDb()
    .update(followRequests)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(
      and(
        eq(followRequests.requesterId, requesterId),
        eq(followRequests.targetId, targetId),
        eq(followRequests.status, "pending"),
      ),
    );
}

/** Removes someone from the actor's followers without deleting their account. */
export async function removeFollower(
  targetId: string,
  followerId: string,
): Promise<void> {
  validatePair(targetId, followerId);
  await getDb()
    .delete(follows)
    .where(
      and(eq(follows.followerId, followerId), eq(follows.followingId, targetId)),
    );
}

/** Used by follow UI to distinguish a private-account request from a follow. */
export async function getFollowRequestState(
  followerId: string | null,
  targetId: string,
): Promise<"none" | "pending"> {
  if (!followerId || !parseUserId(followerId)) return "none";
  const rows = await getDb()
    .select({ id: followRequests.id })
    .from(followRequests)
    .where(
      and(
        eq(followRequests.requesterId, followerId),
        eq(followRequests.targetId, targetId),
        eq(followRequests.status, "pending"),
      ),
    )
    .limit(1);
  return rows.length > 0 ? "pending" : "none";
}
