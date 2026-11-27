"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/dal";
import { getDb } from "@/lib/db";
import { getPublicProfileByUsername } from "@/lib/db/profiles";
import { closeFriends } from "@/lib/db/schema";
import { toSafeMessage } from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import {
  cancelFollowRequest,
  removeFollower,
  respondToFollowRequest,
  setUserRelationship,
} from "@/lib/privacy/relationships";
import {
  getPrivacySettings,
  updateOwnPrivacySettings,
} from "@/lib/privacy/service";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import {
  privacySettingsSchema,
  relationshipSchema,
  type PrivacySettingsValues,
} from "@/lib/validations/privacy";
import { usernameSchema } from "@/lib/validations/auth";
import { toFormErrors } from "@/lib/validations/auth";
import {
  PRIVACY_SCOPE_FIELDS,
  type ActionState,
  type PrivacyScope,
} from "@/app/actions/settings-types";

const RATE_LIMIT_MESSAGE =
  "Too many privacy changes. Please wait a moment before trying again.";

const usernameOnlySchema = z.object({ username: usernameSchema });
const intentSchema = z.object({
  username: usernameSchema,
  intent: z.enum(["add", "remove", "accept", "decline", "cancel", "remove_follower"]),
});

function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Checkbox submits "true"; a hidden companion always submits "false". */
function formBool(formData: FormData, key: string): boolean {
  return formData.getAll(key).includes("true");
}

function splitWords(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .slice(0, 100);
}

async function sessionIdentity(): Promise<{ id: string; username: string } | null> {
  const current = await getCurrentProfile();
  if (!current) return null;
  return { id: current.user.id, username: current.user.username };
}

function rateLimited(userId: string, action: string): boolean {
  return !consumeRateLimit(`settings:${action}:${userId}`, 12, 10 * 60_000).allowed;
}

function fail(scope: string, error: unknown): ActionState {
  logServerError(scope, error);
  return { status: "error", message: toSafeMessage(error) };
}

function revalidatePrivacyPaths(username: string, targetUsername?: string): void {
  revalidatePath("/settings");
  revalidatePath("/settings/privacy");
  for (const path of [
    "account",
    "stories",
    "messages",
    "comments",
    "tags-and-mentions",
    "hidden-words",
    "notifications",
    "blocked",
    "restricted",
    "muted",
    "follow-requests",
  ]) {
    revalidatePath(`/settings/privacy/${path}`);
  }
  revalidatePath("/profile/[username]", "page");
  revalidatePath(`/profile/${username}`);
  if (targetUsername) revalidatePath(`/profile/${targetUsername}`);
}

async function resolveTarget(
  username: string,
  viewerId: string,
): Promise<{ userId: string } | ActionState> {
  const target = await getPublicProfileByUsername(username);
  if (!target) {
    return { status: "error", message: "That profile is not available." };
  }
  if (target.userId === viewerId) {
    return { status: "error", message: "You cannot manage your own account this way." };
  }
  return { userId: target.userId };
}

/** Owner-only privacy write. Unsubmitted fields keep their stored values. */
export async function updatePrivacyAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const requestedScope = formText(formData, "scope");
  const scope: PrivacyScope = Object.hasOwn(PRIVACY_SCOPE_FIELDS, requestedScope)
    ? (requestedScope as PrivacyScope)
    : "account";
  let identity: { id: string; username: string } | null = null;
  let base: PrivacySettingsValues;

  try {
    identity = await sessionIdentity();
    if (!identity) return { status: "error", message: "Sign in to change privacy settings." };
    base = await getPrivacySettings(identity.id);
  } catch (error) {
    return fail("privacy.load", error);
  }

  if (rateLimited(identity.id, `update:${scope}`)) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  const candidate: Record<string, unknown> = { ...base };
  for (const key of PRIVACY_SCOPE_FIELDS[scope]) {
    if (key === "hiddenWords") {
      candidate[key] = splitWords(formText(formData, "hiddenWords"));
    } else if (typeof base[key] === "boolean") {
      candidate[key] = formBool(formData, key);
    } else if (formData.has(key)) {
      candidate[key] = formText(formData, key);
    }
  }

  const parsed = privacySettingsSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted settings.",
      errors: toFormErrors(parsed.error),
    };
  }

  try {
    await updateOwnPrivacySettings(identity.id, parsed.data);
  } catch (error) {
    return fail("privacy.update", error);
  }

  revalidatePrivacyPaths(identity.username);
  return { status: "success", message: "Your privacy settings have been saved." };
}

/** Adds or removes a block, restriction, or mute owned by the session user. */
export async function setRelationshipAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = z
    .intersection(relationshipSchema, z.object({ intent: z.enum(["add", "remove"]) }))
    .safeParse({
      username: formText(formData, "username"),
      kind: formText(formData, "kind"),
      intent: formText(formData, "intent"),
    });
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid username and choose an action." };
  }

  let identity;
  try {
    identity = await sessionIdentity();
    if (!identity) return { status: "error", message: "Sign in to manage relationships." };
  } catch (error) {
    return fail("privacy.relationshipIdentity", error);
  }
  if (rateLimited(identity.id, "relationship")) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  let target;
  try {
    target = await resolveTarget(parsed.data.username, identity.id);
    if ("status" in target) return target;
    await setUserRelationship(
      identity.id,
      target.userId,
      parsed.data.kind,
      parsed.data.intent === "add",
    );
  } catch (error) {
    return fail("privacy.relationship", error);
  }

  revalidatePrivacyPaths(identity.username, parsed.data.username);
  return {
    status: "success",
    message:
      parsed.data.intent === "add"
        ? `${parsed.data.kind} added for @${parsed.data.username}.`
        : `${parsed.data.kind} removed for @${parsed.data.username}.`,
  };
}

/** Accepts or declines a pending request addressed to the session user. */
export async function respondFollowRequestAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = z
    .intersection(usernameOnlySchema, z.object({ accept: z.enum(["true", "false"]) }))
    .safeParse({
      username: formText(formData, "username"),
      accept: formText(formData, "accept"),
    });
  if (!parsed.success) {
    return { status: "error", message: "That request is no longer available." };
  }

  let identity;
  try {
    identity = await sessionIdentity();
    if (!identity) return { status: "error", message: "Sign in to manage requests." };
  } catch (error) {
    return fail("privacy.requestIdentity", error);
  }
  if (rateLimited(identity.id, "follow-request")) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  let target;
  try {
    target = await resolveTarget(parsed.data.username, identity.id);
    if ("status" in target) return target;
    await respondToFollowRequest(
      identity.id,
      target.userId,
      parsed.data.accept === "true",
    );
  } catch (error) {
    return fail("privacy.respondRequest", error);
  }

  revalidatePrivacyPaths(identity.username, parsed.data.username);
  return {
    status: "success",
    message: parsed.data.accept === "true" ? "Follow request accepted." : "Follow request declined.",
  };
}

/** Cancels the session user's own pending follow request. */
export async function cancelFollowRequestAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = usernameOnlySchema.safeParse({ username: formText(formData, "username") });
  if (!parsed.success) {
    return { status: "error", message: "That request is no longer available." };
  }

  let identity;
  try {
    identity = await sessionIdentity();
    if (!identity) return { status: "error", message: "Sign in to manage requests." };
  } catch (error) {
    return fail("privacy.cancelIdentity", error);
  }
  if (rateLimited(identity.id, "follow-request")) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  let target;
  try {
    target = await resolveTarget(parsed.data.username, identity.id);
    if ("status" in target) return target;
    await cancelFollowRequest(identity.id, target.userId);
  } catch (error) {
    return fail("privacy.cancelRequest", error);
  }

  revalidatePrivacyPaths(identity.username, parsed.data.username);
  return { status: "success", message: "Follow request cancelled." };
}

/** Removes a follower without touching the follower's account. */
export async function removeFollowerAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = usernameOnlySchema.safeParse({ username: formText(formData, "username") });
  if (!parsed.success) {
    return { status: "error", message: "That follower is no longer available." };
  }

  let identity;
  try {
    identity = await sessionIdentity();
    if (!identity) return { status: "error", message: "Sign in to manage followers." };
  } catch (error) {
    return fail("privacy.removeFollowerIdentity", error);
  }
  if (rateLimited(identity.id, "follow-request")) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  let target;
  try {
    target = await resolveTarget(parsed.data.username, identity.id);
    if ("status" in target) return target;
    await removeFollower(identity.id, target.userId);
  } catch (error) {
    return fail("privacy.removeFollower", error);
  }

  revalidatePrivacyPaths(identity.username, parsed.data.username);
  return { status: "success", message: `@${parsed.data.username} was removed from your followers.` };
}

/**
 * Close friends are story-only members owned by the session user. There is no
 * generic relationship service row for this edge, so it is written directly.
 */
export async function setCloseFriendAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = intentSchema.safeParse({
    username: formText(formData, "username"),
    intent: formText(formData, "intent"),
  });
  if (!parsed.success || (parsed.data.intent !== "add" && parsed.data.intent !== "remove")) {
    return { status: "error", message: "Enter a valid username and choose an action." };
  }

  let identity;
  try {
    identity = await sessionIdentity();
    if (!identity) return { status: "error", message: "Sign in to manage close friends." };
  } catch (error) {
    return fail("privacy.closeFriendIdentity", error);
  }
  if (rateLimited(identity.id, "close-friend")) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  let target;
  try {
    target = await resolveTarget(parsed.data.username, identity.id);
    if ("status" in target) return target;
    if (parsed.data.intent === "add") {
      await getDb()
        .insert(closeFriends)
        .values({ ownerId: identity.id, memberId: target.userId })
        .onConflictDoNothing();
    } else {
      await getDb()
        .delete(closeFriends)
        .where(
          and(
            eq(closeFriends.ownerId, identity.id),
            eq(closeFriends.memberId, target.userId),
          ),
        );
    }
  } catch (error) {
    return fail("privacy.closeFriend", error);
  }

  revalidatePrivacyPaths(identity.username, parsed.data.username);
  return {
    status: "success",
    message:
      parsed.data.intent === "add"
        ? `@${parsed.data.username} is now a close friend.`
        : `@${parsed.data.username} was removed from close friends.`,
  };
}
