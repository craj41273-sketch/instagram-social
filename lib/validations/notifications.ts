import { z } from "zod";
import {
  MAX_NOTIFICATION_PAGE_SIZE,
  NOTIFICATION_PAGE_SIZE,
} from "@/lib/messaging/constants";

/** Notification endpoints accept only identifiers and bounded paging. */

export const notificationIdSchema = z.uuid();

export const notificationPageQuerySchema = z.object({
  cursor: z.string().max(512).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_NOTIFICATION_PAGE_SIZE)
    .default(NOTIFICATION_PAGE_SIZE),
});
