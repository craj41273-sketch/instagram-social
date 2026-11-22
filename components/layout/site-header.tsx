import Link from "next/link";
import { Brand } from "@/components/shared/brand";
import { StatusBadge } from "@/components/ui/status-badge";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { PageContainer } from "@/components/layout/page-container";

/** Global shell header. Social navigation is introduced in a later block. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <PageContainer className="flex h-16 items-center justify-between gap-3">
        <Brand />
        <nav aria-label="Primary" className="flex items-center gap-2">
          <Link
            href="/design-system"
            className="hidden rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring sm:inline-flex"
          >
            Design system
          </Link>
          <StatusBadge tone="brand" className="hidden md:inline-flex">
            Block 2
          </StatusBadge>
          <ThemeToggle />
        </nav>
      </PageContainer>
    </header>
  );
}
