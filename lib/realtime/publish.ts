import "server-only";
import { createSupabaseAdminClient } from "@/lib/auth/server";
import { getOptionalSupabaseServiceEnv } from "@/lib/env/server";
import {
  REALTIME_EVENTS,
  conversationChannel,
  userChannel,
} from "@/lib/messaging/constants";
import type { RealtimeMessageSignal } from "@/lib/messaging/types";
import { logServerError } from "@/lib/logging";

/**
 * Broadcast is an optional signal after Neon persistence, never the source of
 * truth. Payloads contain opaque IDs only; subscribers refetch from the server.
 */
async function broadcast(
  channelName: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  if (!getOptionalSupabaseServiceEnv()) return false;

  try {
    const supabase = createSupabaseAdminClient();
    const channel = supabase.channel(channelName);
    try {
      const result = await channel.httpSend(event, payload);
      if (!result.success) {
        logServerError("realtime.broadcast", new Error(result.error), {
          channel: channelName,
          status: result.status,
        });
        return false;
      }
      return true;
    } finally {
      await supabase.removeChannel(channel).catch(() => undefined);
    }
  } catch (error) {
    logServerError("realtime.broadcast", error, { channel: channelName });
    return false;
  }
}

/** Called only after the message row has been persisted in Neon. */
export async function publishMessageSignal(
  signal: RealtimeMessageSignal,
  recipientUserId: string,
): Promise<boolean> {
  const [conversation, inbox] = await Promise.all([
    broadcast(conversationChannel(signal.conversationId), REALTIME_EVENTS.message, {
      ...signal,
    }),
    broadcast(userChannel(recipientUserId), REALTIME_EVENTS.message, {
      conversationId: signal.conversationId,
      version: signal.version,
    }),
  ]);

  return conversation || inbox;
}

/** Called only after a social notification row has been persisted. */
export async function publishNotificationSignal(recipientUserId: string): Promise<boolean> {
  return broadcast(userChannel(recipientUserId), REALTIME_EVENTS.notification, {
    version: Date.now(),
  });
}
