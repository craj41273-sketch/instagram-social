/** Serializable state returned by story server actions. */

export type StoryActionStatus = "idle" | "success" | "error";

export interface StoryActionState {
  status: StoryActionStatus;
  message?: string;
  emoji?: string | null;
  storyCleanupFailed?: boolean;
}

export function initialStoryActionState(): StoryActionState {
  return { status: "idle" };
}
