import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function CreateStoryLoading() {
  return (
    <PageContainer className="max-w-xl space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-96 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
    </PageContainer>
  );
}
