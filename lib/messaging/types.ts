/** Safe DTOs shared by Server Components, route handlers, and client islands. */

export type NotificationType =
  | "follow"
  | "like"
  | "comment"
  | "story_reaction"
  | "message";

export interface InboxItem {
  conversationId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  lastMessageAt: string;
  lastMessagePreview: string;
  lastMessageDeleted: boolean;
  unreadCount: number;
}

export interface InboxPage {
  items: InboxItem[];
  nextCursor: string | null;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  deleted: boolean;
}

export interface MessagePage {
  items: MessageItem[];
  nextCursor: string | null;
}

export interface ConversationHeader {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  entityId: string;
  actorId: string;
  actorUsername: string;
  actorDisplayName: string;
  actorAvatarUrl: string | null;
  createdAt: string;
  readAt: string | null;
  href: string | null;
}

export interface NotificationPage {
  items: NotificationItem[];
  nextCursor: string | null;
}

export interface UnreadCounts {
  messages: number;
  notifications: number;
}

/** Opaque realtime signal. Clients always refetch authoritative data. */
export interface RealtimeMessageSignal {
  conversationId: string;
  messageId: string;
  version: number;
}
