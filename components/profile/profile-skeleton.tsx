import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonUserPreview } from "@/components/shared/skeletons";

/** Loading states for public profile and social graph list routes. */
export function ProfileSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-3xl border border-border/70 bg-card/80"
      aria-label="Loading profile"
      aria-busy="true"
    >
      <Skeleton className="h-40 rounded-none sm:h-56" />
      <div className="px-5 pb-6 sm:px-8 sm:pb-8">
        <Skeleton className="-mt-12 size-24 rounded-full ring-4 ring-card sm:-mt-16 sm:size-32" />
        <div className="mt-5 space-y-3">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-full max-w-lg" />
          <Skeleton className="h-4 w-3/4 max-w-md" />
          <div className="flex gap-6 pt-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function UserListSkeleton() {
  return (
    <div
      className="space-y-2 rounded-2xl border border-border/70 bg-card/60 p-4"
      aria-label="Loading people"
      aria-busy="true"
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <SkeletonUserPreview key={index} />
      ))}
    </div>
  );
}
