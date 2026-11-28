"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { fetchJson } from "@/lib/api/client";
import { badgeCount } from "@/lib/messaging/format";
import {
  NAV_POLL_MS,
  REALTIME_REFRESH_EVENT,
} from "@/lib/messaging/constants";
import type { UnreadCounts } from "@/lib/messaging/types";
import { useUserRealtime } from "@/lib/realtime/client";

interface SocialNavProps {
  userId: string | null;
  initialCounts: UnreadCounts;
  isAdmin: boolean;
}

/** Shell navigation with DB-derived badges and one shared realtime subscription. */
export function SocialNav({ userId, initialCounts, isAdmin }: SocialNavProps) {
  const [counts, setCounts] = useState<UnreadCounts>(initialCounts);

  const refresh = useCallback(async () => {
    if (!userId || document.hidden) return;
    try {
      setCounts(await fetchJson<UnreadCounts>("/api/unread"));
    } catch {
      // Badges are advisory; the next poll or navigation retries quietly.
    }
  }, [userId]);

  useUserRealtime(userId);

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

  return (
    <nav
      aria-label="Social navigation"
      className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1 sm:gap-x-3"
    >
      <NavLink href="/posts#stories" label="Stories" />
      <NavLink href="/explore" label="Explore" />
      <NavLink href="/search" label="Search" />
      <NavLink
        href="/messages"
        label="Messages"
        count={userId ? counts.messages : 0}
      />
      <NavLink
        href="/notifications"
        label="Notifications"
        count={userId ? counts.notifications : 0}
      />
      <NavLink href="/settings" label="Settings" />
      <ThemeToggle />
      <details className="w-full sm:hidden">
        <summary className="inline-flex min-h-10 cursor-pointer items-center rounded-md px-1.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          More links
        </summary>
        <div className="flex flex-wrap gap-x-1 gap-y-1 pt-1">
          <NavLink href="/posts" label="Posts" />
          <NavLink href="/appeals" label="Appeals" />
          {isAdmin ? <NavLink href="/admin" label="Admin" /> : null}
        </div>
      </details>
      <div className="hidden items-center gap-x-1 sm:flex sm:gap-x-3">
        <NavLink href="/posts" label="Posts" />
        <NavLink href="/appeals" label="Appeals" />
        {isAdmin ? <NavLink href="/admin" label="Admin" /> : null}
      </div>
    </nav>
  );
}

function NavLink({
  href,
  label,
  count = 0,
}: {
  href: string;
  label: string;
  count?: number;
}) {
  const labelWithCount = count > 0 ? `${label}, ${count} unread` : label;

  return (
    <Link
      href={href}
      aria-label={labelWithCount}
      className="inline-flex min-h-10 items-center gap-1 rounded-md px-1.5 py-2 text-xs whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring sm:min-h-0 sm:px-2 sm:py-1 sm:text-sm"
    >
      {label}
      {count > 0 ? (
        <Badge variant="destructive" className="size-4 px-0 text-[10px]" aria-hidden="true">
          {badgeCount(count)}
        </Badge>
      ) : null}
    </Link>
  );
}
