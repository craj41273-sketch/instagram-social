import type { EditProfileValues } from "@/lib/validations/profile";

/** Serializable state returned by profile and follow server actions. */

export type ProfileActionStatus = "idle" | "error" | "success";

export interface ProfileActionState {
  status: ProfileActionStatus;
  message?: string;
  errors?: Partial<Record<keyof EditProfileValues, string>>;
  username?: string;
}

export function initialProfileActionState(): ProfileActionState {
  return { status: "idle" };
}

export interface FollowActionState {
  status: "idle" | "error" | "success";
  message?: string;
  /** Present only after a confirmed server-side mutation. */
  following?: boolean;
}

export function initialFollowActionState(): FollowActionState {
  return { status: "idle" };
}

export interface MediaActionState {
  status: "idle" | "error" | "success";
  message?: string;
}

export function initialMediaActionState(): MediaActionState {
  return { status: "idle" };
}

export interface PostActionState {
  status: "idle" | "error" | "success";
  message?: string;
  postId?: string;
}

export function initialPostActionState(): PostActionState {
  return { status: "idle" };
}
