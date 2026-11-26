import { z } from "zod";
import { usernameSchema } from "@/lib/validations/auth";
import {
  MAX_INBOX_PAGE_SIZE,
  MAX_MESSAGE_PAGE_SIZE,
  MESSAGE_MAX_LENGTH,
  MESSAGE_PAGE_SIZE,
} from "@/lib/messaging/constants";

/** Client-safe validation. Sender identity is never accepted from a request. */

export const messageContentSchema = z
  .string()
  .trim()
  .min(1, "Write a message before sending.")
  .max(MESSAGE_MAX_LENGTH, `Messages must be ${MESSAGE_MAX_LENGTH} characters or fewer.`);

export const sendMessageSchema = z
  .object({
    content: messageContentSchema,
    clientId: z.uuid(),
  })
  .strict();

export const conversationStartSchema = z
  .object({ username: usernameSchema })
  .strict();

export const messagePageQuerySchema = z.object({
  cursor: z.string().max(512).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_MESSAGE_PAGE_SIZE).default(MESSAGE_PAGE_SIZE),
});

export const inboxPageQuerySchema = z.object({
  cursor: z.string().max(512).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_INBOX_PAGE_SIZE).default(12),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ConversationStartInput = z.infer<typeof conversationStartSchema>;
