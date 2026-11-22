import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SkeletonCard,
  SkeletonLine,
} from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <PageContainer className="py-14">
      <Skeleton className="h-6 w-40 rounded-full" />
      <Skeleton className="mt-6 h-14 w-full max-w-xl" />
      <SkeletonLine className="mt-5 max-w-lg" />
      <SkeletonLine className="mt-2 max-w-md" />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    </PageContainer>
  );
}
