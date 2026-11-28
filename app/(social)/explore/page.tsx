import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Images, Search, UserPlus } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { ExploreGrid } from "@/components/discovery/explore-grid";
import { TrendingStrip } from "@/components/discovery/trending-strip";
import { UserList } from "@/components/profile/user-list";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PremiumButton } from "@/components/ui/premium-button";
import { Input } from "@/components/ui/input";
import { getCurrentProfile } from "@/lib/auth/dal";
import { getExploreTags, getTrendingPosts } from "@/lib/db/discovery";
import type { ExploreTag, TrendingPost } from "@/lib/discovery/types";
import { listRecentPosts, type PublicPostPage } from "@/lib/db/posts";
import { getSuggestedUsers } from "@/lib/db/users";
import { logServerError } from "@/lib/logging";
import { cn } from "@/lib/utils";
import { postFeedQuerySchema } from "@/lib/validations/post";

export const metadata: Metadata = {
  title: "Explore",
  description: "Discover real Luma photos, people, and trending posts.",
};

/** Public, photo-first discovery built from existing post and follow records. */
export default async function ExplorePage() {
  const parsedQuery = postFeedQuerySchema.safeParse({});
  const query = parsedQuery.success
    ? parsedQuery.data
    : { limit: 12, cursor: undefined, tag: undefined };

  let viewer = null;
  try {
    viewer = await getCurrentProfile();
  } catch (error) {
    logServerError("explore.page.viewer", error);
  }

  const viewerId = viewer?.user.id ?? null;

  const [feedResult, tagsResult, trendingResult, suggestionsResult] = await Promise.allSettled([
    listRecentPosts({
      limit: query.limit,
      cursor: query.cursor,
      tag: query.tag,
      viewerUserId: viewerId,
    }),
    getExploreTags(8, viewerId),
    getTrendingPosts(6, viewerId),
    viewer
      ? getSuggestedUsers(viewer.user.id, 6)
      : Promise.resolve<Awaited<ReturnType<typeof getSuggestedUsers>>>([]),
  ]);

  let page: PublicPostPage | null = null;
  let feedFailed = false;
  if (feedResult.status === "fulfilled") {
    page = feedResult.value;
  } else {
    logServerError("explore.page.feed", feedResult.reason);
    feedFailed = true;
  }

  let tags: ExploreTag[] = [];
  let tagsFailed = false;
  if (tagsResult.status === "fulfilled") {
    tags = tagsResult.value;
  } else {
    logServerError("explore.page.tags", tagsResult.reason);
    tagsFailed = true;
  }

  let trending: TrendingPost[] = [];
  let trendingFailed = false;
  if (trendingResult.status === "fulfilled") {
    trending = trendingResult.value;
  } else {
    logServerError("explore.page.trending", trendingResult.reason);
    trendingFailed = true;
  }

  let suggestions: Awaited<ReturnType<typeof getSuggestedUsers>> = [];
  let suggestionsFailed = false;
  if (suggestionsResult.status === "fulfilled") {
    suggestions = suggestionsResult.value;
  } else {
    logServerError("explore.page.suggestions", suggestionsResult.reason);
    suggestionsFailed = true;
  }

  const tagLinkClass = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      active
        ? "border-primary/40 bg-primary/15 text-foreground"
        : "border-border/70 text-muted-foreground hover:bg-accent hover:text-foreground",
    );

  return (
    <PageContainer className="max-w-6xl space-y-10">
      <header className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary">
              <Compass className="size-3.5" aria-hidden="true" />
              Explore Luma
            </p>
            <h1 className="mt-2 font-heading text-3xl tracking-tight sm:text-4xl">
              Find your next favorite frame
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Real photos from the community, ranked by real engagement. No invented posts or
              recommendations.
            </p>
          </div>
          <form action="/search" method="get" className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <div className="relative min-w-0 sm:w-64">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                name="q"
                type="search"
                minLength={2}
                maxLength={50}
                required
                placeholder="Search people or captions"
                aria-label="Search people or captions"
                className="pl-8"
              />
            </div>
            <PremiumButton premiumVariant="soft" type="submit">
              Search
            </PremiumButton>
          </form>
        </div>

        <section aria-labelledby="categories-heading" className="space-y-3">
          <h2 id="categories-heading" className="font-heading text-lg">
            Categories
          </h2>
          {tagsFailed ? (
            <ErrorState
              title="Categories could not load"
              description="Hashtag metadata is temporarily unavailable. Please retry."
            />
          ) : tags.length === 0 ? (
            <EmptyState
              icon={Images}
              title="No categories available"
              description="Categories appear when members use hashtags in their captions."
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              <Link href="/explore" className={tagLinkClass(!query.tag)} aria-current={!query.tag ? "page" : undefined}>
                All
              </Link>
              {tags.map((item) => (
                <Link
                  key={item.tag}
                  href={`/explore?tag=${encodeURIComponent(item.tag)}`}
                  className={tagLinkClass(query.tag === item.tag)}
                  aria-current={query.tag === item.tag ? "page" : undefined}
                >
                  #{item.tag} · {item.count}
                </Link>
              ))}
            </div>
          )}
        </section>
      </header>

      <section aria-labelledby="explore-grid-heading" className="space-y-4">
        <div>
          <h2 id="explore-grid-heading" className="font-heading text-xl">
            {query.tag ? `Photos tagged #${query.tag}` : "Discover photos"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Newest real posts across Luma. Open any tile for the full post.
          </p>
        </div>
        {feedFailed ? (
          <ErrorState
            title="Photos could not load"
            description="The explore feed is temporarily unavailable. Please try again."
            action={
              <PremiumButton premiumVariant="outline" asChild>
                <Link href="/explore">Retry</Link>
              </PremiumButton>
            }
          />
        ) : page ? (
          <ExploreGrid page={page} tag={query.tag} />
        ) : null}
      </section>

      <section aria-labelledby="trending-heading" className="space-y-4">
        <div>
          <h2 id="trending-heading" className="font-heading text-xl">
            Trending now
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Score = (3 × likes + 2 × comments) ÷ (post age in hours + 2). Only real engagement on
            posts from the last 30 days counts; older posts cannot dominate.
          </p>
        </div>
        <TrendingStrip items={trending} failed={trendingFailed} />
      </section>

      <section aria-labelledby="discover-people-heading" className="space-y-4">
        <div>
          <h2 id="discover-people-heading" className="font-heading text-xl">
            Discover people
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Real accounts you do not follow yet. Follow actions use the existing secure follow system.
          </p>
        </div>
        {!viewer ? (
          <EmptyState
            icon={UserPlus}
            title="Sign in to discover people"
            description="Suggestions depend on your confirmed identity and follow state."
            action={
              <PremiumButton premiumVariant="soft" asChild>
                <Link href="/login?next=%2Fexplore">Sign in</Link>
              </PremiumButton>
            }
          />
        ) : suggestionsFailed ? (
          <ErrorState
            title="Suggestions could not load"
            description="People suggestions are temporarily unavailable. Please retry."
          />
        ) : (
          <UserList
            items={suggestions}
            viewerUsername={viewer.user.username}
            emptyTitle="No suggestions yet"
            emptyDescription="Check back once more people have joined Luma."
          />
        )}
      </section>
    </PageContainer>
  );
}
