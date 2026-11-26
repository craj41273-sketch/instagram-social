import type { ReactNode } from "react";
import Link from "next/link";
import { Brand } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { PageContainer } from "@/components/layout/page-container";

/** Responsive shell for profiles, posts, explore, and search. */
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
          <nav aria-label="Social navigation" className="flex min-w-0 items-center gap-1 sm:gap-3">
            {[
              { href: "/posts#stories", label: "Stories" },
              { href: "/explore", label: "Explore" },
              { href: "/search", label: "Search" },
              { href: "/posts", label: "Posts" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring sm:px-2 sm:text-sm"
              >
                {link.label}
              </Link>
            ))}
            <ThemeToggle />
          </nav>
        </PageContainer>
      </header>
      <main className="flex-1 py-8 sm:py-10">{children}</main>
    </>
  );
}
