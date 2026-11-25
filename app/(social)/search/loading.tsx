import { PageContainer } from "@/components/layout/page-container";
import { SkeletonLine } from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

/** Search shell skeleton; the client owns its own results loading state. */
export default function SearchLoading() {
  return (
    <PageContainer className="max-w-5xl space-y-7">
      <div className="space-y-3">
        <SkeletonLine className="h-4 w-24" />
        <SkeletonLine className="h-9 w-80 max-w-full" />
        <SkeletonLine className="h-4 w-full max-w-2xl" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-8 w-64 rounded-lg" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <Skeleton key={index} className="aspect-square w-full rounded-xl" />
        ))}
      </div>
    </PageContainer>
  );
}
