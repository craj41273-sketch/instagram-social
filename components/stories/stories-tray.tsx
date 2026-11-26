import Link from "next/link";
import { Plus } from "lucide-react";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import type { StoryGroup } from "@/lib/stories/types";
import { cn } from "@/lib/utils";

interface StoriesTrayProps {
  groups: StoryGroup[];
}

function ringClass(group: StoryGroup | undefined): string {
  if (!group) return "bg-muted/50";
  if (group.isOwn) return "bg-gradient-to-tr from-violet-500 via-primary to-sky-400";
  if (group.unseen) return "bg-gradient-to-tr from-violet-500 via-primary to-sky-400";
  return "bg-muted-foreground/30";
}

/** Horizontal, real-data story tray for the feed. */
export function StoriesTray({ groups }: StoriesTrayProps) {
  const own = groups.find((group) => group.isOwn);
  const others = groups.filter((group) => !group.isOwn);

  return (
    <section id="stories" aria-labelledby="stories-tray-heading" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 id="stories-tray-heading" className="font-heading text-lg tracking-tight">
            Stories
          </h2>
          <p className="text-xs text-muted-foreground">Fresh for 24 hours.</p>
        </div>
        <Link
          href={own ? `/stories/${own.userId}` : "/stories/create"}
          className="text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          {own ? "View yours" : "Add story"}
        </Link>
      </div>

      <div
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2 sm:gap-4"
        role="list"
      >
        <div role="listitem" className="shrink-0 snap-start">
          <Link
            href={own ? `/stories/${own.userId}` : "/stories/create"}
            className="flex w-20 flex-col items-center gap-2 rounded-xl p-1 text-center focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span className={cn("rounded-full p-[2px]", ringClass(own))}>
              <span className="relative block rounded-full bg-background p-[2px]">
                <ProfileAvatar
                  name={own?.displayName ?? "Your story"}
                  src={own?.avatarUrl ?? null}
                  size="md"
                  className="size-14 sm:size-16"
                />
                {!own ? (
                  <span className="absolute right-0 bottom-0 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background">
                    <Plus className="size-3" aria-hidden="true" />
                  </span>
                ) : null}
              </span>
            </span>
            <span className="w-full truncate text-[11px] text-muted-foreground">
              {own ? "Your story" : "Add story"}
            </span>
          </Link>
        </div>

        {others.map((group) => (
          <div key={group.userId} role="listitem" className="shrink-0 snap-start">
            <Link
              href={`/stories/${group.userId}`}
              className="flex w-20 flex-col items-center gap-2 rounded-xl p-1 text-center focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className={cn("rounded-full p-[2px]", ringClass(group))}>
                <span className="block rounded-full bg-background p-[2px]">
                  <ProfileAvatar
                    name={group.displayName}
                    src={group.avatarUrl}
                    size="md"
                    className="size-14 sm:size-16"
                  />
                </span>
              </span>
              <span className="w-full truncate text-[11px] text-muted-foreground">
                {group.displayName}
              </span>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
