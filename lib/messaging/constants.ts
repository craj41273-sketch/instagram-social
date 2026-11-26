/** Shared, client-safe bounds and intervals for Block 10. */

export const MESSAGE_MAX_LENGTH = 4000;
export const MESSAGE_PAGE_SIZE = 20;
export const MAX_MESSAGE_PAGE_SIZE = 40;
export const INBOX_PAGE_SIZE = 12;
export const MAX_INBOX_PAGE_SIZE = 24;
export const NOTIFICATION_PAGE_SIZE = 20;
export const MAX_NOTIFICATION_PAGE_SIZE = 40;

/** Polling is a safety net, not a second source of truth. */
export const MESSAGE_POLL_MS = 12_000;
export const NAV_POLL_MS = 30_000;
export const INBOX_POLL_MS = 30_000;

export const MESSAGE_RATE_LIMIT = { limit: 45, windowMs: 60_000 } as const;
export const CONVERSATION_RATE_LIMIT = { limit: 20, windowMs: 60_000 } as const;
export const READ_RATE_LIMIT = { limit: 60, windowMs: 60_000 } as const;
export const NOTIFICATION_RATE_LIMIT = { limit: 60, windowMs: 60_000 } as const;

/** Broadcast payloads contain opaque signals only, never message content. */
export const REALTIME_EVENTS = {
  message: "message",
  notification: "notification",
} as const;

export const REALTIME_REFRESH_EVENT = "luma:refresh-unread";

export function conversationChannel(conversationId: string): string {
  return `conversation:${conversationId}`;
}

export function userChannel(userId: string): string {
  return `user:${userId}`;
}
