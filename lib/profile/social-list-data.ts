import "server-only";
import { getCurrentProfile } from "@/lib/auth/dal";
import { listFollowers, listFollowing, type SocialUserPage } from "@/lib/db/follows";
import {
  getPublicProfileByUsername,
  isPrivateProfile,
  type PublicProfile,
} from "@/lib/db/profiles";
import { canViewPosts, getPrivacyContext } from "@/lib/privacy/service";
import { logServerError } from "@/lib/logging";
import { parseListLimit } from "@/lib/pagination";
import { usernameSchema } from "@/lib/validations/auth";

export type SocialListDirection = "followers" | "following";

export interface SocialListData {
  profile: PublicProfile;
  page: SocialUserPage;
  viewerUsername: string | null;
  limit: number;
  canViewList: boolean;
}

export type SocialListResult =
  | { status: "not-found" }
  | { status: "error"; username: string }
  | { status: "ready"; data: SocialListData };

/** Loads one cursor page with a single list query plus one status query. */
export async function loadSocialList(
  direction: SocialListDirection,
  rawUsername: string,
  rawCursor: string | undefined,
  rawLimit: unknown,
): Promise<SocialListResult> {
  const parsedUsername = usernameSchema.safeParse(rawUsername);
  if (!parsedUsername.success) return { status: "not-found" };

  const username = parsedUsername.data;
  let profile: PublicProfile | null = null;
  let viewerUsername: string | null = null;
  let viewerId: string | null = null;

  try {
    profile = await getPublicProfileByUsername(username);
  } catch (error) {
    logServerError("profile.list.load", error, { username });
    return { status: "error", username };
  }
  if (!profile) return { status: "not-found" };

  try {
    const viewer = await getCurrentProfile();
    viewerUsername = viewer?.user.username ?? null;
    viewerId = viewer?.user.id ?? null;
  } catch (error) {
    logServerError("profile.list.viewer", error);
  }

  const limit = parseListLimit(rawLimit);
  let page: SocialUserPage = { items: [], nextCursor: null };

  const context = await getPrivacyContext(viewerId, profile.userId);
  const privateProfile = await isPrivateProfile(profile.userId);
  const canViewList = canViewPosts({
    ...context,
    settings: { ...context.settings, isPrivate: privateProfile },
  });
  if (canViewList) {
    try {
      page =
        direction === "followers"
          ? await listFollowers(profile.userId, { viewerUserId: viewerId, limit, cursor: rawCursor })
          : await listFollowing(profile.userId, { viewerUserId: viewerId, limit, cursor: rawCursor });
    } catch (error) {
      logServerError("profile.list.edges", error, { username, direction });
      return { status: "error", username };
    }
  }

  return {
    status: "ready",
    data: { profile, page, viewerUsername, limit, canViewList },
  };
}
