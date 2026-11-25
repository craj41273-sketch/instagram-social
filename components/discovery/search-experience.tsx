"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, Search, X } from "lucide-react";
import { FollowButton } from "@/components/profile/follow-button";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { ImageContainer } from "@/components/shared/image-container";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonLine, SkeletonUserPreview } from "@/components/shared/skeletons";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { PremiumButton } from "@/components/ui/premium-button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SearchPage, SearchPerson, SearchPost, SearchResults } from "@/lib/discovery/types";
import { safeHttpUrl } from "@/lib/profile/format";
import type { SearchTab } from "@/lib/validations/discovery";

interface SearchExperienceProps {
  initialQuery?: string;
  isAuthenticated: boolean;
  viewerUsername: string | null;
}

type Status = "idle" | "loading" | "success" | "error";

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 12;

function errorMessage(body: unknown): string {
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
    return body.error;
  }
  return "Search is temporarily unavailable. Please try again.";
}

function appendPage<T>(previous: SearchPage<T>, next: SearchPage<T>): SearchPage<T> {
  return {
    items: [...previous.items, ...next.items],
    hasMore: next.hasMore,
    nextOffset: next.nextOffset,
  };
}

function SearchSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="p-4">
            <SkeletonUserPreview />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <SkeletonLine className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Debounced client view over the authenticated /api/search projection. */
export function SearchExperience({
  initialQuery = "",
  isAuthenticated,
  viewerUsername,
}: SearchExperienceProps) {
  const [query, setQuery] = React.useState(initialQuery);
  const [tab, setTab] = React.useState<SearchTab>("all");
  const [offset, setOffset] = React.useState(0);
  const [append, setAppend] = React.useState(false);
  const [results, setResults] = React.useState<SearchResults | null>(null);
  const [status, setStatus] = React.useState<Status>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  const active = isAuthenticated && query.trim().length >= 2;
  const displayStatus: Status = active ? status : "idle";

  React.useEffect(() => {
    if (!active) return;

    const trimmed = query.trim().toLowerCase();
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      setError(null);

      try {
        const params = new URLSearchParams({ q: trimmed, tab });
        if (offset > 0) params.set("offset", String(offset));
        const response = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const body: unknown = await response.json();
        if (!response.ok) throw new Error(errorMessage(body));

        const next = body as SearchResults;
        setResults((previous) => {
          if (!append || !previous) return next;
          return {
            people: tab === "posts" ? previous.people : appendPage(previous.people, next.people),
            posts: tab === "people" ? previous.posts : appendPage(previous.posts, next.posts),
          };
        });
        setStatus("success");
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(caught instanceof Error ? caught.message : "Search is unavailable.");
        setStatus("error");
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, tab, offset, append, attempt, active]);

  function changeQuery(value: string) {
    setQuery(value);
    setOffset(0);
    setAppend(false);
    setResults(null);
    setError(null);
    setStatus("idle");
  }

  function changeTab(value: string) {
    setTab(value as SearchTab);
    setOffset(0);
    setAppend(false);
    setResults(null);
    setError(null);
    setStatus("idle");
  }

  const peoplePage = results?.people;
  const postsPage = results?.posts;
  const people = peoplePage?.items ?? [];
  const posts = postsPage?.items ?? [];
  const visibleCount = (tab === "posts" ? 0 : people.length) + (tab === "people" ? 0 : posts.length);
  const hasMore =
    tab === "people"
      ? Boolean(peoplePage?.hasMore)
      : tab === "posts"
        ? Boolean(postsPage?.hasMore)
        : Boolean(peoplePage?.hasMore || postsPage?.hasMore);

  return (
    <div className="space-y-6">
      <form
        role="search"
        onSubmit={(event) => event.preventDefault()}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="relative min-w-0 flex-1">
          <label htmlFor="global-search" className="sr-only">
            Search people and posts
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="global-search"
            type="search"
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            maxLength={50}
            autoComplete="off"
            placeholder="Search people or captions"
            className="pr-11 pl-9"
          />
          {query.length > 0 ? (
            <button
              type="button"
              onClick={() => changeQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground sm:shrink-0">
          Type at least 2 characters. Results are capped per section.
        </p>
      </form>

      <div aria-live="polite" aria-atomic="true" className="min-h-5 text-xs text-muted-foreground">
        {!isAuthenticated
          ? "Sign in to search."
          : displayStatus === "loading"
            ? "Searching…"
            : error
              ? error
              : displayStatus === "success"
                ? `${visibleCount} result${visibleCount === 1 ? "" : "s"} shown`
                : null}
      </div>

      {!isAuthenticated ? (
        <EmptyState
          icon={Search}
          title="Sign in to search"
          description="Search is authenticated to keep requests bounded and private."
          action={
            <PremiumButton premiumVariant="soft" asChild>
              <Link href="/login?next=%2Fsearch">Sign in</Link>
            </PremiumButton>
          }
        />
      ) : (
        <Tabs value={tab} onValueChange={changeTab} className="space-y-5">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
          </TabsList>

          {displayStatus === "error" && !results ? (
            <ErrorState
              title="Search failed"
              description={error ?? "Please try again in a moment."}
              action={
                <PremiumButton
                  premiumVariant="outline"
                  type="button"
                  onClick={() => setAttempt((value) => value + 1)}
                >
                  Retry
                </PremiumButton>
              }
            />
          ) : displayStatus === "loading" && !results ? (
            <SearchSkeleton />
          ) : displayStatus === "idle" || !results || visibleCount === 0 ? (
            <EmptyState
              icon={Search}
              title={
                displayStatus === "idle"
                  ? "Search Luma"
                  : tab === "people"
                    ? "No people found"
                    : tab === "posts"
                      ? "No posts found"
                      : "No results found"
              }
              description={
                displayStatus === "idle"
                  ? "Find accounts by username or display name, and posts by caption text."
                  : "Try a different spelling or a broader term."
              }
            />
          ) : (
            <div className="space-y-8">
              {tab !== "posts" && people.length > 0 ? (
                <section aria-labelledby="people-results-heading" className="space-y-3">
                  <h2 id="people-results-heading" className="font-heading text-lg">
                    People
                  </h2>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {people.map((person: SearchPerson) => (
                      <PeopleResult
                        key={person.userId}
                        person={person}
                        viewerUsername={viewerUsername}
                      />
                    ))}
                  </ul>
                </section>
              ) : null}

              {tab !== "people" && posts.length > 0 ? (
                <section aria-labelledby="post-results-heading" className="space-y-3">
                  <h2 id="post-results-heading" className="font-heading text-lg">
                    Posts
                  </h2>
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {posts.map((post: SearchPost) => (
                      <PostResult key={post.postId} post={post} />
                    ))}
                  </ul>
                </section>
              ) : null}

              {hasMore ? (
                <div className="flex justify-center">
                  <PremiumButton
                    premiumVariant="outline"
                    type="button"
                    disabled={displayStatus === "loading"}
                    onClick={() => {
                      setOffset((value) => Math.min(1_000, value + PAGE_SIZE));
                      setAppend(true);
                    }}
                  >
                    {displayStatus === "loading" ? "Loading…" : "Load more results"}
                  </PremiumButton>
                </div>
              ) : null}
            </div>
          )}
        </Tabs>
      )}
    </div>
  );
}

function PeopleResult({
  person,
  viewerUsername,
}: {
  person: SearchPerson;
  viewerUsername: string | null;
}) {
  const profileHref = `/profile/${encodeURIComponent(person.username)}`;

  return (
    <li>
      <Card className="p-4">
        <div className="flex min-w-0 items-start gap-3">
          <Link href={profileHref} className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-ring">
            <ProfileAvatar name={person.displayName} src={person.avatarUrl} size="md" />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={profileHref}
              className="block truncate text-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              {person.displayName}
            </Link>
            <p className="truncate text-xs text-muted-foreground">@{person.username}</p>
            {person.bio ? (
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{person.bio}</p>
            ) : null}
          </div>
          <FollowButton
            targetUsername={person.username}
            initialFollowing={person.isFollowing}
            isAuthenticated
            isSelf={viewerUsername === person.username}
            loginHref={`/login?next=${encodeURIComponent(profileHref)}`}
            compact
          />
        </div>
      </Card>
    </li>
  );
}

function PostResult({ post }: { post: SearchPost }) {
  const alt = post.caption
    ? `Post by @${post.authorUsername}: ${post.caption.slice(0, 120)}`
    : `Photo post by @${post.authorUsername}`;

  return (
    <li className="min-w-0">
      <Link
        href={`/post/${post.postId}`}
        className="group block overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={alt}
      >
        <ImageContainer
          alt={alt}
          src={safeHttpUrl(post.thumbnailUrl) ?? undefined}
          ratio="square"
          unoptimized
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="rounded-xl"
        />
        <div className="mt-2 space-y-1 px-0.5">
          <p className="line-clamp-2 text-xs text-foreground">{post.caption || "Photo post"}</p>
          <p className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="truncate">@{post.authorUsername}</span>
            <span className="inline-flex shrink-0 items-center gap-1">
              <Heart className="size-3" aria-hidden="true" />
              {post.likeCount}
            </span>
          </p>
        </div>
      </Link>
    </li>
  );
}
