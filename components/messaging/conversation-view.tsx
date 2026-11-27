"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, SendHorizontal } from "lucide-react";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { ReportLink } from "@/components/reporting/report-link";
import { EmptyState } from "@/components/shared/empty-state";
import { SensitiveSurface } from "@/components/shared/sensitive-surface";
import { ErrorState } from "@/components/shared/error-state";
import { PremiumButton } from "@/components/ui/premium-button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { fetchJson, postJson } from "@/lib/api/client";
import {
  MAX_MESSAGE_PAGE_SIZE,
  MESSAGE_MAX_LENGTH,
  MESSAGE_POLL_MS,
  MESSAGE_PAGE_SIZE,
  REALTIME_REFRESH_EVENT,
} from "@/lib/messaging/constants";
import { relativeTime } from "@/lib/messaging/format";
import type {
  ConversationHeader,
  MessageItem,
  MessagePage,
} from "@/lib/messaging/types";
import { useConversationRealtime } from "@/lib/realtime/client";
import { cn } from "@/lib/utils";

interface ConversationViewProps {
  conversationId: string;
  viewerId: string;
  header: ConversationHeader;
  initialPage: MessagePage;
}

function mergeMessages(current: MessageItem[], incoming: MessageItem[]): MessageItem[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => {
    const time = Date.parse(a.createdAt) - Date.parse(b.createdAt);
    return time === 0 ? a.id.localeCompare(b.id) : time;
  });
}

/** Authoritative chat view: sends persist first; signals only trigger refetch. */
export function ConversationView({
  conversationId,
  viewerId,
  header,
  initialPage,
}: ConversationViewProps) {
  const { toast } = useToast();
  const loginHref = `/login?next=${encodeURIComponent(`/messages/${conversationId}`)}`;
  const [items, setItems] = useState(initialPage.items);
  const [cursor, setCursor] = useState(initialPage.nextCursor);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    if (document.hidden) return;
    try {
      const page = await fetchJson<MessagePage>(
        `/api/messages/${conversationId}?limit=${MAX_MESSAGE_PAGE_SIZE}`,
      );
      setItems((current) => mergeMessages(current, page.items));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Messages could not refresh.");
    }
  }, [conversationId]);

  useConversationRealtime(conversationId, refresh);

  useEffect(() => {
    const markRead = async () => {
      try {
        await fetchJson(`/api/messages/${conversationId}/read`, { method: "POST" });
        window.dispatchEvent(new CustomEvent(REALTIME_REFRESH_EVENT));
      } catch {
        // Unread state is advisory; the next successful load retries by opening.
      }
    };
    void markRead();
  }, [conversationId]);

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), MESSAGE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bottomRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }, [items.length]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ cursor, limit: String(MESSAGE_PAGE_SIZE) });
      const page = await fetchJson<MessagePage>(
        `/api/messages/${conversationId}?${params}`,
      );
      setItems((current) => mergeMessages(current, page.items));
      setCursor(page.nextCursor);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load older messages.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function send() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const result = await postJson<{ message: MessageItem }>(
        `/api/messages/${conversationId}`,
        { content, clientId: crypto.randomUUID() },
      );
      setItems((current) => mergeMessages(current, [result.message]));
      setDraft("");
      setError(null);
      window.dispatchEvent(new CustomEvent(REALTIME_REFRESH_EVENT));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Message could not be sent.";
      setError(message);
      toast({ title: "Message not sent", description: message, tone: "error" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <PremiumButton premiumVariant="ghost" size="icon" asChild>
          <Link href="/messages" aria-label="Back to messages">
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Link>
        </PremiumButton>
        <ProfileAvatar name={header.displayName} src={header.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <Link
            href={`/profile/${encodeURIComponent(header.username)}`}
            className="block truncate text-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            {header.displayName}
          </Link>
          <p className="truncate text-xs text-muted-foreground">@{header.username}</p>
        </div>
        <ReportLink
          targetType="conversation"
          targetId={conversationId}
          isAuthenticated
          loginHref={loginHref}
        />
      </div>

      {error ? (
        <ErrorState title="Update failed" description={error} />
      ) : null}

      <SensitiveSurface className="max-h-[60vh] min-h-64 overflow-y-auto rounded-2xl border border-border/60 bg-surface/40 p-4">
        <section aria-label="Conversation messages" className="space-y-3">
          {cursor ? (
            <div className="flex justify-center">
              <PremiumButton
                premiumVariant="outline"
                size="sm"
                type="button"
                disabled={loadingMore}
                onClick={() => void loadMore()}
              >
                {loadingMore ? <Spinner className="size-4" /> : null}
                {loadingMore ? "Loading…" : "Load older messages"}
              </PremiumButton>
            </div>
          ) : null}

          {items.length === 0 ? (
            <EmptyState
              icon={SendHorizontal}
              title="Start the conversation"
              description="Send the first message. It will be saved before it appears here."
            />
          ) : (
            items.map((message) => {
              const mine = message.senderId === viewerId;
              return (
                <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap",
                      mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                    )}
                  >
                    {message.deleted ? (
                      <span className="italic opacity-70">Message deleted</span>
                    ) : (
                      message.content
                    )}
                    <span
                      className={cn(
                        "mt-1 block text-right text-[10px] opacity-70",
                        mine ? "text-primary-foreground" : "text-muted-foreground",
                      )}
                    >
                      {relativeTime(message.createdAt)}
                    </span>
                    {!message.deleted ? (
                      <div className="mt-0.5 flex justify-end">
                        <ReportLink
                          targetType="message"
                          targetId={message.id}
                          isAuthenticated
                          loginHref={loginHref}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} aria-hidden="true" />
        </section>
      </SensitiveSurface>

      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <label htmlFor="message-draft" className="sr-only">
          Write a message to {header.displayName}
        </label>
        <Textarea
          id="message-draft"
          value={draft}
          maxLength={MESSAGE_MAX_LENGTH}
          placeholder={`Message ${header.displayName}`}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {draft.length}/{MESSAGE_MAX_LENGTH}
          </p>
          <PremiumButton type="submit" disabled={sending || draft.trim().length === 0}>
            {sending ? <Spinner className="size-4" /> : <SendHorizontal className="size-4" />}
            Send
          </PremiumButton>
        </div>
      </form>
    </div>
  );
}
