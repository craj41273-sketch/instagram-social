import type { ReactNode } from "react";
import Link from "next/link";
import { Brand } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { PageContainer } from "@/components/layout/page-container";

/** Lightweight shell for public profiles and owner-only profile settings. */
export default function SocialLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <PageContainer className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
            aria-label="Luma home"
          >
            <Brand />
          </Link>
          <nav aria-label="Social navigation" className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/posts"
              className="rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              Posts
            </Link>
            <ThemeToggle />
          </nav>
        </PageContainer>
      </header>
      <main className="flex-1 py-8 sm:py-10">{children}</main>
    </>
  );
}
