"use client";

import { useCallback, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/auth/client";
import {
  REALTIME_EVENTS,
  REALTIME_REFRESH_EVENT,
  conversationChannel,
  userChannel,
} from "@/lib/messaging/constants";

const USER_EVENTS = [REALTIME_EVENTS.message, REALTIME_EVENTS.notification] as const;
const CONVERSATION_EVENTS = [REALTIME_EVENTS.message] as const;

/**
 * Browser-side Broadcast subscribers. Signals are opaque: every subscriber
 * refetches from the authenticated server API instead of trusting a payload.
 * The user channel is mounted once by the social shell; pages only listen to
 * the resulting DOM event, so there is one subscription per signed-in tab.
 */
function useBroadcast(
  channelName: string | null,
  events: readonly string[],
  onSignal: () => void,
): void {
  useEffect(() => {
    if (!channelName) return;

    let supabase: ReturnType<typeof createSupabaseBrowserClient>;
    try {
      supabase = createSupabaseBrowserClient();
    } catch {
      // Missing public config simply leaves polling as the delivery path.
      return;
    }

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    for (const event of events) {
      channel.on("broadcast", { event }, onSignal);
    }

    void channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [channelName, events, onSignal]);
}

/** One subscription per user, shared through a window event. */
export function useUserRealtime(userId: string | null): void {
  const onSignal = useCallback(() => {
    window.dispatchEvent(new CustomEvent(REALTIME_REFRESH_EVENT, { detail: { userId } }));
  }, [userId]);

  useBroadcast(userId ? userChannel(userId) : null, USER_EVENTS, onSignal);
}

/** Scoped to one open conversation; cleanup happens on navigation/unmount. */
export function useConversationRealtime(
  conversationId: string,
  onSignal: () => void,
): void {
  useBroadcast(conversationChannel(conversationId), CONVERSATION_EVENTS, onSignal);
}
