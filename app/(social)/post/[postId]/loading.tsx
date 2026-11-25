import { PageContainer } from "@/components/layout/page-container";
import { FeedSkeleton } from "@/components/posts/feed-skeleton";

export default function Loading() {
  return (
    <PageContainer className="max-w-2xl space-y-5">
      <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      <FeedSkeleton cards={1} />
      <div className="mx-auto h-48 w-full max-w-2xl animate-pulse rounded-2xl bg-muted" />
    </PageContainer>
  );
}
