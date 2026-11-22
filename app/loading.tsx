import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/layout/page-container";

export default function Loading() {
  return (
    <PageContainer className="py-16">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="mt-6 h-12 w-full max-w-xl" />
      <Skeleton className="mt-4 h-5 w-full max-w-lg" />
      <div className="mt-14 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-36 w-full" />
        ))}
      </div>
    </PageContainer>
  );
}
