import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
import { PageContainer } from "@/components/layout/page-container";
import { PremiumButton } from "@/components/ui/premium-button";
import { UserList } from "@/components/profile/user-list";
import type { SocialUserPage } from "@/lib/db/follows";
import type { SocialListDirection } from "@/lib/profile/social-list-data";

interface SocialListViewProps {
  username: string;
  direction: "followers" | "following";
  page: SocialUserPage;
  viewerUsername: string | null;
  nextHref: string | null;
}

/** Shared presentation for follower and following pagination pages. */
export function SocialListView({
  username,
  direction,
  page,
  viewerUsername,
  nextHref,
}: SocialListViewProps) {
  const title = direction === "followers" ? "Followers" : "Following";

  return (
    <PageContainer className="max-w-3xl space-y-6">
      <div className="space-y-3">
        <Link
          href={`/profile/${username}`}
          className="inline-flex items-center gap-1.5 rounded-md text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to @{username}
        </Link>
        <div>
          <h1 className="font-heading text-2xl tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real connections, loaded a page at a time.
          </p>
        </div>
      </div>

      <UserList
        items={page.items}
        viewerUsername={viewerUsername}
        emptyTitle={direction === "followers" ? "No followers yet" : "Not following anyone yet"}
        emptyDescription={
          direction === "followers"
            ? `When people follow @${username}, they will appear here.`
            : `When @${username} follows people, they will appear here.`
        }
      />

      {nextHref ? (
        <div className="flex justify-center">
          <PremiumButton premiumVariant="outline" asChild>
            <Link href={nextHref}>
              Load more
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </PremiumButton>
        </div>
      ) : null}
    </PageContainer>
  );
}

/** Route-level failure state with an honest retry link. */
export function SocialListError({
  username,
  direction,
}: {
  username: string;
  direction: SocialListDirection;
}) {
  const href = `/profile/${username}/${direction}`;

  return (
    <PageContainer className="max-w-3xl py-10">
      <ErrorState
        title="This list could not load"
        description="The connection could not be read right now. Please try again."
        action={
          <PremiumButton premiumVariant="outline" asChild>
            <Link href={href}>Try again</Link>
          </PremiumButton>
        }
      />
    </PageContainer>
  );
}
