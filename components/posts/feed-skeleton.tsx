import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Shared loading placeholder for feed and post-detail routes. */
export function FeedSkeleton({ cards = 2 }: { cards?: number }) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {Array.from({ length: cards }, (_, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center gap-3">
            <Skeleton className="size-9 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          </CardHeader>
          <Skeleton className="mx-4 aspect-[4/3] rounded-xl" />
          <CardContent className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
