import Link from "next/link";
import { Heart, MessageCircle, Sparkles } from "lucide-react";
import { ImageContainer } from "@/components/shared/image-container";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PremiumButton } from "@/components/ui/premium-button";
import type { TrendingPost } from "@/lib/discovery/types";
import { safeHttpUrl } from "@/lib/profile/format";

interface TrendingStripProps {
  items: TrendingPost[];
  failed?: boolean;
}

function ageLabel(hours: number): string {
  if (hours < 1) return "under 1h";
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

/** Transparent view of the real-engagement ranking described on the page. */
export function TrendingStrip({ items, failed = false }: TrendingStripProps) {
  if (failed) {
    return (
      <ErrorState
        title="Trending could not load"
        description="Engagement data is temporarily unavailable. Please retry."
        action={
          <PremiumButton premiumVariant="outline" asChild>
            <Link href="/explore">Retry</Link>
          </PremiumButton>
        }
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Nothing is trending yet"
        description="Trending needs real likes and comments on recent posts. Check back after the community engages."
      />
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
      {items.map((post) => (
        <li key={post.postId} className="min-w-0">
          <Link
            href={`/post/${post.postId}`}
            className="group block overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label={`View trending post: ${post.caption.slice(0, 100) || "Photo post"}`}
          >
            <ImageContainer
              alt={post.caption ? `Trending post: ${post.caption.slice(0, 120)}` : "Trending photo post"}
              src={safeHttpUrl(post.thumbnailUrl) ?? undefined}
              ratio="square"
              unoptimized
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
              className="rounded-xl"
            />
            <div className="mt-2 space-y-1 px-0.5 text-[11px] text-muted-foreground">
              <p className="line-clamp-2 text-xs text-foreground">
                {post.caption || "Photo post"}
              </p>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="inline-flex items-center gap-1">
                  <Heart className="size-3" aria-hidden="true" />
                  {post.likeCount}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="size-3" aria-hidden="true" />
                  {post.commentCount}
                </span>
                <span className="text-primary">score {post.score}</span>
              </p>
              <p>{ageLabel(post.ageHours)} old</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
