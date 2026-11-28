/**
 * Browser-safe stand-in for every Server Action import during the GitHub Pages
 * static export. The Node action source remains in app/actions/ unchanged; it
 * is simply unreachable from the static bundle. Mutations fail loudly instead
 * of pretending to persist data.
 */

import type { SocialPageResult } from "@/app/actions/social";
import type { StoryActionState } from "@/lib/stories/action-state";

export interface ActionState {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Partial<Record<string, string>>;
  active?: boolean;
}

export interface ReportActionState extends ActionState {
  reportId?: string;
}

export type PrivacyScope =
  | "all"
  | "account"
  | "stories"
  | "messages"
  | "comments"
  | "mentions"
  | "hiddenWords"
  | "notifications";

type SettingKey =
  | "isPrivate"
  | "whoCanMessage"
  | "messageRequestsEnabled"
  | "readReceipts"
  | "activityStatus"
  | "conversationPrivacy"
  | "whoCanComment"
  | "commentsEnabled"
  | "mentionPermission"
  | "tagApproval"
  | "discoverable"
  | "contactVisibility"
  | "profileInfoVisibility"
  | "hideLikeCounts"
  | "hideViewCounts"
  | "hiddenWords"
  | "storyAudience"
  | "storyReplies"
  | "storyInteractions";

export const PRIVACY_SCOPE_FIELDS: Record<PrivacyScope, readonly SettingKey[]> = {
  all: [
    "isPrivate",
    "whoCanMessage",
    "messageRequestsEnabled",
    "readReceipts",
    "activityStatus",
    "conversationPrivacy",
    "whoCanComment",
    "commentsEnabled",
    "mentionPermission",
    "tagApproval",
    "discoverable",
    "contactVisibility",
    "profileInfoVisibility",
    "hideLikeCounts",
    "hideViewCounts",
    "hiddenWords",
    "storyAudience",
    "storyReplies",
    "storyInteractions",
  ],
  account: [
    "isPrivate",
    "discoverable",
    "contactVisibility",
    "profileInfoVisibility",
    "activityStatus",
    "hideLikeCounts",
    "hideViewCounts",
  ],
  stories: ["storyAudience", "storyReplies", "storyInteractions"],
  messages: [
    "whoCanMessage",
    "messageRequestsEnabled",
    "readReceipts",
    "conversationPrivacy",
  ],
  comments: ["whoCanComment", "commentsEnabled"],
  mentions: ["mentionPermission", "tagApproval"],
  hiddenWords: ["hiddenWords"],
  notifications: ["activityStatus", "messageRequestsEnabled", "readReceipts"],
};

export function initialActionState(): ActionState {
  return { status: "idle" };
}

export function initialReportActionState(): ReportActionState {
  return { status: "idle" };
}

function unavailable(name: string): Promise<never> {
  return Promise.reject(
    new Error(`${name} needs a server backend and is unavailable on GitHub Pages.`),
  );
}

function stub<Result = ActionState>(
  name: string,
): (..._args: unknown[]) => Promise<Result> {
  return () => unavailable(name);
}

export const addEvidenceNoteAction = stub("addEvidenceNoteAction");
export const addLinkAction = stub("addLinkAction");
export const addProjectAction = stub("addProjectAction");
export const applyModerationActionAction = stub("applyModerationActionAction");
export const cancelFollowRequestAction = stub("cancelFollowRequestAction");
export const createAppealAction = stub<ReportActionState>("createAppealAction");
export const createCommentAction = stub("createCommentAction");
export const createReportAction = stub<ReportActionState>("createReportAction");
export const decideAppealAction = stub("decideAppealAction");
export const deleteCommentAction = stub("deleteCommentAction");
export const deleteLinkAction = stub("deleteLinkAction");
export const deletePostAction = stub("deletePostAction");
export const deleteProjectAction = stub("deleteProjectAction");
export const deleteStoryAction = stub<StoryActionState>("deleteStoryAction");
export const followAction = stub("followAction");
export const forgotPasswordAction = stub("forgotPasswordAction");
export const likePostAction = stub("likePostAction");
export const loadMoreFollowsAction =
  stub<SocialPageResult>("loadMoreFollowsAction");
export const loginAction = stub("loginAction");
export const logoutAction = stub<void>("logoutAction");
export const recordStoryViewAction = stub<boolean>("recordStoryViewAction");
export const removeFollowerAction = stub("removeFollowerAction");
export const removeRiskAssessmentAction = stub("removeRiskAssessmentAction");
export const reorderLinksAction = stub("reorderLinksAction");
export const reorderProjectsAction = stub("reorderProjectsAction");
export const resendVerificationAction = stub("resendVerificationAction");
export const resetPasswordAction = stub("resetPasswordAction");
export const respondFollowRequestAction = stub("respondFollowRequestAction");
export const retryProfileSetupFormAction = stub("retryProfileSetupFormAction");
export const setCloseFriendAction = stub("setCloseFriendAction");
export const setRelationshipAction = stub("setRelationshipAction");
export const setRiskAssessmentAction = stub("setRiskAssessmentAction");
export const signupAction = stub("signupAction");
export const storyReactionAction = stub<StoryActionState>("storyReactionAction");
export const toggleTrustHypeAction = stub("toggleTrustHypeAction");
export const unlikePostAction = stub("unlikePostAction");
export const updateAccountCategoryAction = stub("updateAccountCategoryAction");
export const updateLinkAction = stub("updateLinkAction");
export const updatePostAction = stub("updatePostAction");
export const updatePrivacyAction = stub("updatePrivacyAction");
export const updateProfileAction = stub("updateProfileAction");
export const updateProjectAction = stub("updateProjectAction");
export const updateReportAction = stub("updateReportAction");
export const uploadProfileMediaAction = stub("uploadProfileMediaAction");
