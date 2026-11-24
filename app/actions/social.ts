"use server";

import { z } from "zod";
import { loadSocialList } from "@/lib/profile/social-list-data";
import { logServerError } from "@/lib/logging";
import { usernameSchema } from "@/lib/validations/auth";
import type { SocialUserPage } from "@/lib/db/follows";

const socialPageSchema = z.object({
  username: usernameSchema,
  direction: z.enum(["followers", "following"]),
  cursor: z.string().max(512).optional(),
  limit: z.number().int().min(1).max(24).optional(),
});

export type SocialPageResult =
  | { status: "error"; message: string }
  | { status: "ready"; page: SocialUserPage };

/** Loads another public cursor page for the followers/following dialogs. */
export async function loadMoreFollowsAction(input: {
  username: string;
  direction: "followers" | "following";
  cursor?: string;
  limit?: number;
}): Promise<SocialPageResult> {
  const parsed = socialPageSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That list could not be loaded." };
  }

  try {
    const result = await loadSocialList(
      parsed.data.direction,
      parsed.data.username,
      parsed.data.cursor,
      parsed.data.limit,
    );

    if (result.status !== "ready") {
      return { status: "error", message: "That list could not be loaded." };
    }

    return { status: "ready", page: result.data.page };
  } catch (error) {
    logServerError("social.loadMore", error, {
      username: parsed.data.username,
      direction: parsed.data.direction,
    });
    return { status: "error", message: "Please try again in a moment." };
  }
}
