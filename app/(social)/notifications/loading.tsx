import { PageContainer } from "@/components/layout/page-container";
import { SkeletonLine, SkeletonUserPreview } from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function NotificationsLoading() {
  return (
    <PageContainer className="max-w-3xl space-y-6" aria-hidden="true">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-48" />
        <SkeletonLine className="h-4 w-80 max-w-full" />
      </div>
      <Card className="divide-y divide-border/60 py-0">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="px-5 py-3">
            <SkeletonUserPreview />
          </div>
        ))}
      </Card>
    </PageContainer>
  );
}
