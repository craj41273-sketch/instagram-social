import type { NotificationType } from "@/lib/messaging/types";

/** Safety notices are visible in the inbox but have no safe destination link. */
type NavigationNoticeType =
  | NotificationType
  | "moderation"
  | "report_update"
  | "appeal_update";

/** Destinations are derived only from rows the viewer is allowed to see. */

export interface NotificationTargets {
  profiles: Set<string>;
  posts: Set<string>;
  /** Active story ID -> owner application user ID. */
  stories: Map<string, string>;
  conversations: Set<string>;
}

export interface NotificationNavigationInput {
  type: NavigationNoticeType;
  entityId: string;
  actorUsername: string;
}

export function resolveNotificationHref(
  notification: NotificationNavigationInput,
  targets: NotificationTargets,
): string | null {
  switch (notification.type) {
    case "follow":
      return targets.profiles.has(notification.actorUsername)
        ? `/profile/${notification.actorUsername}`
        : null;
    case "like":
    case "comment":
      return targets.posts.has(notification.entityId)
        ? `/post/${notification.entityId}`
        : null;
    case "story_reaction": {
      const ownerId = targets.stories.get(notification.entityId);
      return ownerId ? `/stories/${ownerId}` : null;
    }
    case "message":
      return targets.conversations.has(notification.entityId)
        ? `/messages/${notification.entityId}`
        : null;
    case "moderation":
    case "report_update":
    case "appeal_update":
      return null;
    default:
      return null;
  }
}
