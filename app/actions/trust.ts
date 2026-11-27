"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/dal";
import { getPublicProfileByUsername } from "@/lib/db/profiles";
import { toSafeMessage } from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { toggleTrustHype } from "@/lib/trust/service";
import { usernameSchema } from "@/lib/validations/auth";
import type { ActionState } from "@/app/actions/settings-types";

/** Gives or withdraws one hype; the giver always comes from the session. */
export async function toggleTrustHypeAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = formData.get("username");
  const parsed = usernameSchema.safeParse(typeof raw === "string" ? raw : "");
  if (!parsed.success) {
    return { status: "error", message: "That profile is not available." };
  }

  let current;
  try {
    current = await getCurrentProfile();
  } catch (error) {
    logServerError("trust.identity", error);
    return { status: "error", message: "We could not verify your account. Please try again." };
  }
  if (!current) {
    return { status: "error", message: "Sign in to give trust hypes." };
  }

  const giverId = current.user.id;
  if (!consumeRateLimit(`trust:toggle:${giverId}`, 30, 60_000).allowed) {
    return {
      status: "error",
      message: "Too many changes. Please wait a moment before trying again.",
    };
  }

  try {
    const target = await getPublicProfileByUsername(parsed.data);
    if (!target) return { status: "error", message: "That profile is not available." };

    const result = await toggleTrustHype(giverId, target.userId);

    revalidatePath("/profile/[username]", "page");
    revalidatePath(`/profile/${parsed.data}`);
    revalidatePath(`/profile/${current.user.username}`);

    return {
      status: "success",
      active: result.active,
      message: result.active ? "Hype added." : "Hype withdrawn.",
    };
  } catch (error) {
    logServerError("trust.toggle", error, { userId: giverId });
    return { status: "error", message: toSafeMessage(error) };
  }
}
