import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { FollowButton } from "@/components/profile/follow-button";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import type { SocialUserItem } from "@/lib/db/follows";

interface UserListProps {
  items: SocialUserItem[];
  viewerUsername: string | null;
  emptyTitle: string;
  emptyDescription: string;
}

/** One query-backed list row; the action receives only a username. */
export function UserListItem({
  item,
  viewerUsername,
}: {
  item: SocialUserItem;
  viewerUsername: string | null;
}) {
  const loginHref = `/login?next=${encodeURIComponent(`/profile/${item.username}`)}`;
  const joined = new Date(item.followedAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <Link
        href={`/profile/${item.username}`}
        className="flex min-w-0 items-center gap-3 rounded-lg transition-colors hover:bg-accent/60 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <ProfileAvatar name={item.displayName} src={item.avatarUrl} size="md" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{item.displayName}</span>
          <span className="block truncate text-xs text-muted-foreground">
            @{item.username} · {joined}
          </span>
        </span>
      </Link>

      <FollowButton
        targetUsername={item.username}
        initialFollowing={item.isFollowing}
        isAuthenticated={viewerUsername !== null}
        isSelf={viewerUsername === item.username}
        loginHref={loginHref}
        compact
      />
    </li>
  );
}

export function UserList({
  items,
  viewerUsername,
  emptyTitle,
  emptyDescription,
}: UserListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <Card className="divide-y divide-border/60 py-0">
      <ul>
        {items.map((item) => (
          <UserListItem
            key={`${item.userId}-${item.followedAt}`}
            item={item}
            viewerUsername={viewerUsername}
          />
        ))}
      </ul>
    </Card>
  );
}
