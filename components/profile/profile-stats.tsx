"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Grid3X3 } from "lucide-react";
import { loadMoreFollowsAction } from "@/lib/static/actions";
import { UserList } from "@/components/profile/user-list";
import { EmptyState } from "@/components/shared/empty-state";
import { PremiumButton } from "@/components/ui/premium-button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { SocialUserPage } from "@/lib/db/follows";
import type { SocialListDirection } from "@/lib/profile/social-list-data";
import { cn } from "@/lib/utils";

interface ProfileStatsProps {
  username: string;
  posts: number;
  followers: number;
  following: number;
  initialFollowers: SocialUserPage;
  initialFollowing: SocialUserPage;
  viewerUsername: string | null;
  limit: number;
}

const statLabel = "text-xs uppercase tracking-[0.14em] text-muted-foreground";

function SocialDialog({
  username,
  direction,
  count,
  initialPage,
  viewerUsername,
  limit,
}: {
  username: string;
  direction: SocialListDirection;
  count: number;
  initialPage: SocialUserPage;
  viewerUsername: string | null;
  limit: number;
}) {
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const title = direction === "followers" ? "Followers" : "Following";

  async function loadMore() {
    if (!page.nextCursor || loading) return;
    setLoading(true);
    setError(null);

    try {
      const result = await loadMoreFollowsAction({
        username,
        direction,
        cursor: page.nextCursor,
        limit,
      });

      if (result.status === "error") {
        setError(result.message);
        return;
      }

      setPage((current) => ({
        items: [...current.items, ...result.page.items],
        nextCursor: result.page.nextCursor,
      }));
    } catch {
      setError("We could not load more people. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group rounded-md text-left transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
          aria-label={`View ${count} ${direction}`}
        >
          <span className="flex flex-row-reverse items-baseline justify-end gap-1.5">
            <span className={statLabel}>{direction}</span>
            <span className="text-lg font-semibold tabular-nums">{count}</span>
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Real connections for @{username}, loaded a page at a time.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {page.items.length === 0 ? (
          <EmptyState
            title={direction === "followers" ? "No followers yet" : "Not following anyone yet"}
            description={
              direction === "followers"
                ? `When people follow @${username}, they will appear here.`
                : `When @${username} follows people, they will appear here.`
            }
          />
        ) : (
          <UserList
            items={page.items}
            viewerUsername={viewerUsername}
            emptyTitle="Nothing here yet"
            emptyDescription="No people matched this list."
          />
        )}

        {page.nextCursor ? (
          <div className="flex justify-center pt-2">
            <PremiumButton
              premiumVariant="outline"
              onClick={loadMore}
              disabled={loading}
              aria-busy={loading || undefined}
            >
              {loading ? (
                <>
                  <Spinner className="size-4 text-current" label="Loading more people" />
                  Loading…
                </>
              ) : (
                <>
                  Load more
                  <ChevronRight className="size-4" aria-hidden="true" />
                </>
              )}
            </PremiumButton>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** Database-backed stats with working follower/following dialogs. */
export function ProfileStats({
  username,
  posts,
  followers,
  following,
  initialFollowers,
  initialFollowing,
  viewerUsername,
  limit,
}: ProfileStatsProps) {
  return (
    <dl className="flex flex-wrap items-center gap-x-6 gap-y-3 sm:gap-x-8">
      <SocialDialog
        username={username}
        direction="followers"
        count={followers}
        initialPage={initialFollowers}
        viewerUsername={viewerUsername}
        limit={limit}
      />
      <SocialDialog
        username={username}
        direction="following"
        count={following}
        initialPage={initialFollowing}
        viewerUsername={viewerUsername}
        limit={limit}
      />
      <Link
        href="#posts"
        className={cn(
          "group flex flex-row-reverse items-baseline justify-end gap-1.5 rounded-md transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring",
        )}
      >
        <span className={statLabel}>posts</span>
        <span className="text-lg font-semibold tabular-nums">{posts}</span>
        <Grid3X3 className="size-3 text-muted-foreground" aria-hidden="true" />
      </Link>
    </dl>
  );
}
