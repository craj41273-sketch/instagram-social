import type { Metadata } from "next";
import Link from "next/link";
import { Images, Search } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { CreatePostControl } from "@/components/posts/create-post-dialog";
import { PostCard } from "@/components/posts/post-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PremiumButton } from "@/components/ui/premium-button";
import { Input } from "@/components/ui/input";
import { getCurrentProfile } from "@/lib/auth/dal";
import { listRecentPosts } from "@/lib/db/posts";
import { logServerError } from "@/lib/logging";
import { postFeedQuerySchema } from "@/lib/validations/post";

export const metadata: Metadata = {
  title: "Posts",
  description: "A real, photo-first feed of posts published on Luma.",
};

interface PostsPageProps {
  searchParams: Promise<{ cursor?: string; limit?: string; tag?: string }>;
}

/** Public feed with real post rows, bounded paging, and hashtag filtering. */
export default async function PostsPage({ searchParams }: PostsPageProps) {
  const parsedQuery = postFeedQuerySchema.safeParse(await searchParams);
  const query = parsedQuery.success
    ? parsedQuery.data
    : { limit: 12, cursor: undefined, tag: undefined };

  let viewer = null;
  try {
    viewer = await getCurrentProfile();
  } catch (error) {
    logServerError("posts.page.viewer", error);
  }

  let page = null;
  let failed = false;
  try {
    page = await listRecentPosts({
      limit: query.limit,
      cursor: query.cursor,
      tag: query.tag,
    });
  } catch (error) {
    logServerError("posts.page.feed", error, { tagLength: query.tag?.length ?? 0 });
    failed = true;
  }

  const nextParams = new URLSearchParams();
  if (query.tag) nextParams.set("tag", query.tag);
  if (query.limit !== 12) nextParams.set("limit", String(query.limit));
  if (page?.nextCursor) nextParams.set("cursor", page.nextCursor);
  const nextHref = `/posts?${nextParams.toString()}`;

  return (
    <PageContainer className="max-w-2xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-primary">The feed</p>
          <h1 className="font-heading text-2xl tracking-tight sm:text-3xl">Recent posts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every frame here comes from a real post and Supabase image upload.
          </p>
        </div>
        <CreatePostControl isAuthenticated={Boolean(viewer)} />
      </div>

      <form action="/posts" method="get" className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            name="tag"
            defaultValue={query.tag ?? ""}
            placeholder="Filter by hashtag"
            aria-label="Filter by hashtag"
            className="pl-8"
          />
        </div>
        <PremiumButton premiumVariant="soft" type="submit">
          Filter
        </PremiumButton>
        {query.tag ? (
          <PremiumButton premiumVariant="ghost" asChild>
            <Link href="/posts">Clear</Link>
          </PremiumButton>
        ) : null}
      </form>

      {query.tag ? (
        <p className="text-sm text-muted-foreground">
          Showing posts tagged <span className="font-medium text-primary">#{query.tag}</span>
        </p>
      ) : null}

      {failed ? (
        <ErrorState
          title="The feed could not load"
          description="Post data is temporarily unavailable. Please try again in a moment."
          action={
            <PremiumButton premiumVariant="outline" asChild>
              <Link href="/posts">Retry</Link>
            </PremiumButton>
          }
        />
      ) : !page || page.items.length === 0 ? (
        <EmptyState
          icon={Images}
          title={query.tag ? "No posts with that hashtag" : "No posts yet"}
          description={
            query.tag
              ? "Try another hashtag or clear the filter to see the full feed."
              : "When someone publishes a photo, it will appear here."
          }
          action={
            query.tag ? (
              <PremiumButton premiumVariant="outline" asChild>
                <Link href="/posts">View all posts</Link>
              </PremiumButton>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {page.items.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              viewerUserId={viewer?.user.id ?? null}
            />
          ))}

          {page.nextCursor ? (
            <div className="flex justify-center pt-2">
              <PremiumButton premiumVariant="outline" asChild>
                <Link href={nextHref}>Load more posts</Link>
              </PremiumButton>
            </div>
          ) : null}
        </div>
      )}
    </PageContainer>
  );
}
