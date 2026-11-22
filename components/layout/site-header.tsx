import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { Brand } from "@/components/shared/brand";

/** Global header. Navigation for social features is added in later blocks. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <PageContainer className="flex h-16 items-center justify-between">
        <Brand />
        <Badge variant="secondary">Foundation</Badge>
      </PageContainer>
    </header>
  );
}
