"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PremiumButton } from "@/components/ui/premium-button";
import { Spinner } from "@/components/ui/spinner";
import { fetchJson } from "@/lib/api/client";
import {
  INBOX_POLL_MS,
  REALTIME_REFRESH_EVENT,
} from "@/lib/messaging/constants";
import { badgeCount, relativeTime } from "@/lib/messaging/format";
import type { InboxItem, InboxPage } from "@/lib/messaging/types";

interface InboxViewProps {
  initialPage: InboxPage;
  limit: number;
}

function mergePages(current: InboxItem[], incoming: InboxItem[]): InboxItem[] {
  const seen = new Set(current.map((item) => item.conversationId));
  return [...current, ...incoming.filter((item) => !seen.has(item.conversationId))];
}

/** Server-backed inbox with cursor paging and refresh-only realtime signals. */
export function InboxView({ initialPage, limit }: InboxViewProps) {
  const [page, setPage] = useState(initialPage);
  const [pending, setPending] = useState(false);
  const [respondingRequest, setRespondingRequest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (document.hidden) return;
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      setPage(await fetchJson<InboxPage>(`/api/conversations?${params}`));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Inbox refresh failed.");
    }
  }, [limit]);

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), INBOX_POLL_MS);
    const onSignal = () => void refresh();
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };

    window.addEventListener(REALTIME_REFRESH_EVENT, onSignal);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(REALTIME_REFRESH_EVENT, onSignal);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  async function loadMore() {
    if (!page.nextCursor || pending) return;
    setPending(true);
    try {
      const params = new URLSearchParams({
        cursor: page.nextCursor,
        limit: String(limit),
      });
      const next = await fetchJson<InboxPage>(`/api/conversations?${params}`);
      setPage((current) => ({
        items: mergePages(current.items, next.items),
        nextCursor: next.nextCursor,
      }));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load more conversations.");
    } finally {
      setPending(false);
    }
  }

  async function respondToRequest(conversationId: string, action: "accept" | "decline") {
    if (respondingRequest) return;
    setRespondingRequest(conversationId);
    try {
      await fetchJson(`/api/conversations/${conversationId}/request`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request could not be updated.");
    } finally {
      setRespondingRequest(null);
    }
  }

  return (
    <div className="space-y-3">
      {error ? (
        <ErrorState
          title="Inbox update failed"
          description={error}
        />
      ) : null}
      {page.items.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="No conversations yet"
          description="Open a profile or search result and use Message to start a real conversation."
        />
      ) : (
        <Card className="divide-y divide-border/60 py-0">
          <ul>
            {page.items.map((item) => (
              <InboxRow
                key={item.conversationId}
                item={item}
                responding={respondingRequest === item.conversationId}
                onRespond={(action) => void respondToRequest(item.conversationId, action)}
              />
            ))}
          </ul>
        </Card>
      )}
      {page.nextCursor ? (
        <div className="flex justify-center">
          <PremiumButton
            premiumVariant="outline"
            type="button"
            disabled={pending}
            onClick={() => void loadMore()}
          >
            {pending ? <Spinner className="size-4" /> : null}
            {pending ? "Loading…" : "Load more conversations"}
          </PremiumButton>
        </div>
      ) : null}
    </div>
  );
}

function InboxRow({
  item,
  responding,
  onRespond,
}: {
  item: InboxItem;
  responding: boolean;
  onRespond: (action: "accept" | "decline") => void;
}) {
  const identity = (
    <>
      <ProfileAvatar name={item.displayName} src={item.avatarUrl} size="md" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{item.displayName}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {relativeTime(item.lastMessageAt)}
          </span>
        </span>
        <span className="block truncate text-xs text-muted-foreground">@{item.username}</span>
        <span
          className={`mt-1 block truncate text-xs ${item.unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"} ${item.lastMessageDeleted ? "italic" : ""}`}
        >
          {item.lastMessagePreview}
        </span>
      </span>
    </>
  );

  if (item.canRespondToRequest) {
    return (
      <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">{identity}</div>
        <div className="flex shrink-0 gap-2 self-end sm:self-auto">
          <PremiumButton
            premiumVariant="soft"
            size="sm"
            type="button"
            disabled={responding}
            onClick={() => onRespond("accept")}
          >
            {responding ? <Spinner className="size-4" /> : null}
            Accept
          </PremiumButton>
          <PremiumButton
            premiumVariant="danger"
            size="sm"
            type="button"
            disabled={responding}
            onClick={() => onRespond("decline")}
          >
            Decline
          </PremiumButton>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <Link
        href={`/messages/${item.conversationId}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg transition-colors hover:bg-accent/60 focus-visible:outline-2 focus-visible:outline-ring"
      >
        {identity}
        {item.unreadCount > 0 ? (
          <Badge variant="default" aria-label={`${item.unreadCount} unread messages`}>
            {badgeCount(item.unreadCount)}
          </Badge>
        ) : null}
      </Link>
      <Link
        href={`/profile/${encodeURIComponent(item.username)}`}
        className="shrink-0 self-end rounded-md px-1 text-xs text-primary transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-ring sm:self-auto"
      >
        View profile
      </Link>
    </li>
  );
}
