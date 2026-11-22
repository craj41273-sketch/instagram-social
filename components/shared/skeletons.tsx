import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Reusable loading placeholders built on the shadcn/ui Skeleton. */
export function SkeletonLine({ className }: { className?: string }) {
  return <Skeleton className={cn("h-4 w-full", className)} />;
}

export function SkeletonAvatar({ className }: { className?: string }) {
  return <Skeleton className={cn("size-10 shrink-0 rounded-full", className)} />;
}

export function SkeletonUserPreview({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <SkeletonAvatar />
      <div className="flex-1 space-y-2">
        <SkeletonLine className="h-3.5 w-32" />
        <SkeletonLine className="h-3 w-20" />
      </div>
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "space-y-4 rounded-2xl border border-border/60 bg-card p-card",
        className,
      )}
    >
      <Skeleton className="aspect-[4/3] w-full rounded-xl" />
      <SkeletonLine className="h-4 w-2/3" />
      <SkeletonLine className="w-full" />
      <SkeletonLine className="w-4/5" />
    </div>
  );
}
