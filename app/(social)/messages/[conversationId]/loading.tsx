import { PageContainer } from "@/components/layout/page-container";
import { SkeletonLine, SkeletonUserPreview } from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function ConversationLoading() {
  return (
    <PageContainer className="max-w-3xl space-y-5" aria-hidden="true">
      <SkeletonUserPreview />
      <Card className="min-h-64 space-y-4 p-4">
        <SkeletonLine className="h-10 w-2/3 rounded-2xl" />
        <SkeletonLine className="ms-auto h-10 w-1/2 rounded-2xl" />
        <SkeletonLine className="h-10 w-3/5 rounded-2xl" />
      </Card>
      <Skeleton className="h-20 w-full rounded-xl" />
    </PageContainer>
  );
}
