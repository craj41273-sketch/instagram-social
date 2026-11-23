import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditProfileLoading() {
  return (
    <PageContainer className="max-w-3xl space-y-6" aria-busy="true">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="space-y-4 rounded-2xl border border-border/70 bg-card/60 p-6">
        <Skeleton className="h-5 w-32" />
        <div className="grid gap-5 sm:grid-cols-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
        <Skeleton className="h-28" />
        <Skeleton className="h-14" />
      </div>
    </PageContainer>
  );
}
