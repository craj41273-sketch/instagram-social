import { PageContainer } from "@/components/layout/page-container";
import { SkeletonLine, SkeletonUserPreview } from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function MessagesLoading() {
  return (
    <PageContainer className="max-w-3xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-40" />
        <SkeletonLine className="h-4 w-72 max-w-full" />
      </div>
      <Card className="divide-y divide-border/60 py-0" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="px-5 py-4">
            <SkeletonUserPreview />
          </div>
        ))}
      </Card>
    </PageContainer>
  );
}
