import { PageContainer } from "@/components/layout/page-container";
import { getCurrentYear } from "@/components/shared/current-year";
import { APP_NAME } from "@/lib/constants";

export async function SiteFooter() {
  const year = await getCurrentYear();

  return (
    <footer className="border-t border-border/60 py-8">
      <PageContainer className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          &copy; {year} {APP_NAME}
        </p>
        <p>Architecture foundation &middot; Block 1</p>
      </PageContainer>
    </footer>
  );
}
