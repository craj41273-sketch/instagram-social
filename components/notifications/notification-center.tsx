"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Heart,
  MessageCircle,
  Smile,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PremiumButton } from "@/components/ui/premium-button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { fetchJson } from "@/lib/api/client";
import {
  NAV_POLL_MS,
  REALTIME_REFRESH_EVENT,
} from "@/lib/messaging/constants";
import { relativeTime } from "@/lib/messaging/format";
import type {
  NotificationItem,
  NotificationPage,
  NotificationType,
} from "@/lib/messaging/types";
import { cn } from "@/lib/utils";

interface NotificationCenterProps {
  initialPage: NotificationPage;
  limit: number;
}

const ICONS: Record<NotificationType, LucideIcon> = {
  follow: UserPlus,
  like: Heart,
  comment: MessageCircle,
  story_reaction: Smile,
  message: MessageCircle,
};

const VERBS: Record<NotificationType, string> = {
  follow: "started following you",
  like: "liked your post",
  comment: "commented on your post",
  story_reaction: "reacted to your story",
  message: "sent you a message",
};

function mergePages(current: NotificationItem[], incoming: NotificationItem[]): NotificationItem[] {
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id),
  );
}

/** Recipient-only activity list with validated destinations and read state. */
export function NotificationCenter({ initialPage, limit }: NotificationCenterProps) {
  const { toast } = useToast();
  const [page, setPage] = useState(initialPage);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasUnread = page.items.some((item) => item.readAt === null);

  const refresh = useCallback(async () => {
    if (document.hidden) return;
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      const refreshed = await fetchJson<NotificationPage>(`/api/notifications?${params}`);
      setPage((current) => ({
        items: mergePages(current.items, refreshed.items),
        nextCursor: current.nextCursor ?? refreshed.nextCursor,
      }));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Notifications could not refresh.");
    }
  }, [limit]);

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), NAV_POLL_MS);
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

  async function markOne(notificationId: string) {
    try {
      await fetchJson(`/api/notifications/${notificationId}`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      setPage((current) => ({
        ...current,
        items: current.items.map((item) =>
          item.id === notificationId ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      }));
      window.dispatchEvent(new CustomEvent(REALTIME_REFRESH_EVENT));
    } catch {
      // Navigation still works; the next poll reconciles read state.
    }
  }

  async function markAll() {
    setPending(true);
    try {
      await fetchJson("/api/notifications/read-all", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const now = new Date().toISOString();
      setPage((current) => ({
        ...current,
        items: current.items.map((item) => ({ ...item, readAt: item.readAt ?? now })),
      }));
      window.dispatchEvent(new CustomEvent(REALTIME_REFRESH_EVENT));
      toast({ title: "Notifications marked as read", tone: "success" });
    } catch (caught) {
      toast({
        title: "Could not update notifications",
        description: caught instanceof Error ? caught.message : "Please try again.",
        tone: "error",
      });
    } finally {
      setPending(false);
    }
  }

  async function loadMore() {
    if (!page.nextCursor || pending) return;
    setPending(true);
    try {
      const params = new URLSearchParams({ cursor: page.nextCursor, limit: String(limit) });
      const next = await fetchJson<NotificationPage>(`/api/notifications?${params}`);
      setPage((current) => ({
        items: mergePages(current.items, next.items),
        nextCursor: next.nextCursor,
      }));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load more notifications.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {hasUnread ? "Unread activity is highlighted." : "You are all caught up."}
        </p>
        {hasUnread ? (
          <PremiumButton
            premiumVariant="outline"
            size="sm"
            type="button"
            disabled={pending}
            onClick={() => void markAll()}
          >
            <CheckCheck className="size-4" aria-hidden="true" />
            Mark all read
          </PremiumButton>
        ) : null}
      </div>

      {error ? <ErrorState title="Update failed" description={error} /> : null}

      {page.items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="Follows, likes, comments, story reactions, and messages will appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/80">
          <ul className="divide-y divide-border/60">
            {page.items.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                onOpen={() => void markOne(item.id)}
              />
            ))}
          </ul>
        </div>
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
            {pending ? "Loading…" : "Load more notifications"}
          </PremiumButton>
        </div>
      ) : null}
    </div>
  );
}

function NotificationRow({
  item,
  onOpen,
}: {
  item: NotificationItem;
  onOpen: () => void;
}) {
  const Icon = ICONS[item.type];
  const unread = item.readAt === null;
  const content = (
    <span className="flex min-w-0 flex-1 items-start gap-3">
      <span className="relative shrink-0">
        <ProfileAvatar name={item.actorDisplayName} src={item.actorAvatarUrl} size="sm" />
        <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-card ring-2 ring-card">
          <Icon className="size-3 text-primary" aria-hidden="true" />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm">
          <span className="font-medium">{item.actorDisplayName}</span>{" "}
          <span className="text-muted-foreground">{VERBS[item.type]}</span>
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          @{item.actorUsername} · {relativeTime(item.createdAt)}
        </span>
      </span>
      {unread ? (
        <span
          className="mt-2 size-2 shrink-0 rounded-full bg-primary"
          role="img"
          aria-label="Unread"
        />
      ) : null}
    </span>
  );

  return (
    <li className={cn("px-4 py-3 sm:px-5", unread ? "bg-primary/[0.04]" : "")}>
      {item.href ? (
        <Link
          href={item.href}
          onClick={onOpen}
          className="flex rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
        >
          {content}
        </Link>
      ) : (
        <div className="flex">{content}</div>
      )}
    </li>
  );
}
