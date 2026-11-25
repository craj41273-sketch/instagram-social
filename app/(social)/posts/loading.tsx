import { PageContainer } from "@/components/layout/page-container";
import { FeedSkeleton } from "@/components/posts/feed-skeleton";

export default function Loading() {
  return (
    <PageContainer className="max-w-2xl space-y-6">
      <SkeletonHeading />
      <FeedSkeleton />
    </PageContainer>
  );
}

function SkeletonHeading() {
  return (
    <div className="space-y-2">
      <div className="h-3 w-20 animate-pulse rounded bg-muted" />
      <div className="h-8 w-40 animate-pulse rounded bg-muted" />
    </div>
  );
}
