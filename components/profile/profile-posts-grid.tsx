import Link from "next/link";
import { Images } from "lucide-react";
import { ImageContainer } from "@/components/shared/image-container";
import { EmptyState } from "@/components/shared/empty-state";
import type { ProfilePostPage } from "@/lib/db/posts";
import { safeHttpUrl } from "@/lib/profile/format";

/** Real posts from Neon; no sample or placeholder tiles. */
export function ProfilePostsGrid({ page }: { page: ProfilePostPage }) {
  if (page.items.length === 0) {
    return (
      <EmptyState
        icon={Images}
        title="No posts yet"
        description="When this profile publishes a photo, it will appear here."
      />
    );
  }

  return (
    <div>
      <ul className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {page.items.map((post) => {
          const src = safeHttpUrl(post.thumbnailUrl) ?? undefined;

          return (
            <li key={post.postId}>
              <Link
                href={`/post/${post.postId}`}
                className="group relative block overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
                aria-label={`View post from ${new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`}
              >
                <ImageContainer
                  alt={post.caption ? `Post: ${post.caption.slice(0, 80)}` : "Profile post"}
                  src={src}
                  ratio="square"
                  unoptimized
                  sizes="(max-width: 640px) 33vw, 240px"
                  className="rounded-lg transition-transform duration-300 group-hover:scale-[1.02]"
                />
                {post.mediaCount > 1 ? (
                  <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                    <Images className="size-3" aria-hidden="true" />
                    {post.mediaCount}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>

      {page.nextCursor ? (
        <div className="mt-4 flex justify-center">
          <Link
            href="/posts"
            className="rounded-md text-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            View more posts
          </Link>
        </div>
      ) : null}
    </div>
  );
}
