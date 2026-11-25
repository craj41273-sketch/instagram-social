import { PageContainer } from "@/components/layout/page-container";
import { SkeletonLine } from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

const tiles = Array.from({ length: 10 }, (_, index) => index);

/** Matches the explore header, category chips, and photo grid layout. */
export default function ExploreLoading() {
  return (
    <PageContainer className="max-w-6xl space-y-10">
      <div className="space-y-4">
        <SkeletonLine className="h-4 w-32" />
        <SkeletonLine className="h-9 w-72 max-w-full" />
        <SkeletonLine className="h-4 w-full max-w-xl" />
        <div className="flex flex-wrap gap-2 pt-2">
          {tiles.slice(0, 6).map((tile) => (
            <Skeleton key={tile} className="h-8 w-24 rounded-full" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <SkeletonLine className="h-6 w-44" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
          {tiles.map((tile) => (
            <Skeleton key={tile} className="aspect-square w-full rounded-xl" />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
