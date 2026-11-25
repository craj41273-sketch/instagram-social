import Link from "next/link";
import { Images } from "lucide-react";
import { ImageContainer } from "@/components/shared/image-container";
import { EmptyState } from "@/components/shared/empty-state";
import { PremiumButton } from "@/components/ui/premium-button";
import type { PublicPostPage } from "@/lib/db/posts";
import { safeHttpUrl } from "@/lib/profile/format";

interface ExploreGridProps {
  page: PublicPostPage;
  tag?: string | null;
}

/** Square, photo-first grid built only from real post media. */
export function ExploreGrid({ page, tag }: ExploreGridProps) {
  if (page.items.length === 0) {
    return (
      <EmptyState
        icon={Images}
        title={tag ? `No posts tagged #${tag}` : "No discoverable posts yet"}
        description={
          tag
            ? "Try another category or clear the filter to see everything."
            : "When Luma members publish photos, they will appear here."
        }
      />
    );
  }

  const nextParams = new URLSearchParams();
  if (tag) nextParams.set("tag", tag);
  if (page.nextCursor) nextParams.set("cursor", page.nextCursor);

  return (
    <div className="space-y-5">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
        {page.items.map((post) => {
          const src = safeHttpUrl(post.media[0]?.publicUrl) ?? undefined;
          const alt = post.caption
            ? `Post by @${post.author.username}: ${post.caption.slice(0, 120)}`
            : `Photo post by @${post.author.username}`;

          return (
            <li key={post.id} className="min-w-0">
              <Link
                href={`/post/${post.id}`}
                aria-label={alt}
                className="group relative block overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <ImageContainer
                  alt={alt}
                  src={src}
                  ratio="square"
                  unoptimized
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                  className="rounded-xl"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-8 opacity-100 transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100 motion-reduce:transition-none">
                  <p className="line-clamp-2 text-[11px] leading-snug text-white">
                    {post.caption || "Photo post"}
                  </p>
                </div>
                {post.media.length > 1 ? (
                  <span className="pointer-events-none absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                    <Images className="size-3" aria-hidden="true" />
                    {post.media.length}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>

      {page.nextCursor ? (
        <div className="flex justify-center">
          <PremiumButton premiumVariant="outline" asChild>
            <Link href={`/explore?${nextParams.toString()}`}>Load more photos</Link>
          </PremiumButton>
        </div>
      ) : null}
    </div>
  );
}
