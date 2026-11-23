import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";

interface ProfileStatsProps {
  username: string;
  followers: number;
  following: number;
}

const statLabel = "text-xs uppercase tracking-[0.14em] text-muted-foreground";

/** Database-backed counts; posts remain an honest future placeholder. */
export function ProfileStats({
  username,
  followers,
  following,
}: ProfileStatsProps) {
  return (
    <dl className="flex flex-wrap items-center gap-x-6 gap-y-3 sm:gap-x-8">
      <Link
        href={`/profile/${username}/followers`}
        className="group rounded-md transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
      >
        <div className="flex flex-row-reverse items-baseline justify-end gap-1.5">
          <dt className={statLabel}>followers</dt>
          <dd className="text-lg font-semibold tabular-nums">{followers}</dd>
        </div>
      </Link>
      <Link
        href={`/profile/${username}/following`}
        className="group rounded-md transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
      >
        <div className="flex flex-row-reverse items-baseline justify-end gap-1.5">
          <dt className={statLabel}>following</dt>
          <dd className="text-lg font-semibold tabular-nums">{following}</dd>
        </div>
      </Link>
      <div className="flex flex-row-reverse items-baseline justify-end gap-1.5" title="Posts arrive in a later block">
        <dt className={statLabel}>posts</dt>
        <dd className="text-lg font-semibold tabular-nums text-muted-foreground">—</dd>
        <StatusBadge tone="neutral" className="ml-0.5 px-1.5 py-0 text-[10px]">
          soon
        </StatusBadge>
      </div>
    </dl>
  );
}
