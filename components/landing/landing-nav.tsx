"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Brand } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { PremiumButton } from "@/components/ui/premium-button";
import { cn } from "@/lib/utils";

const primaryLinks = [
  { href: "/", label: "Home" },
  { href: "/#discover", label: "Discover" },
  { href: "/#features", label: "Features" },
  { href: "/#about", label: "About" },
] as const;

const linkStyles =
  "rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Responsive marketing navigation with an accessible mobile disclosure. */
export function LandingNav() {
  const [open, setOpen] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const toggleRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;

    panelRef.current?.querySelector<HTMLElement>("a")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }

    function onResize() {
      if (window.matchMedia("(min-width: 768px)").matches) setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <PageContainer className="flex h-16 max-w-6xl items-center justify-between gap-4 sm:h-[4.5rem]">
        <Link
          href="/"
          aria-label="Luma home"
          className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <Brand />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {primaryLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkStyles}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <PremiumButton size="sm" asChild>
            <Link href="/signup">Create account</Link>
          </PremiumButton>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Button
            ref={toggleRef}
            variant="ghost"
            size="icon"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
            aria-controls="landing-mobile-navigation"
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </Button>
        </div>
      </PageContainer>

      <div
        id="landing-mobile-navigation"
        ref={panelRef}
        hidden={!open}
        className={cn(
          "border-t border-border/60 bg-background/95 backdrop-blur-xl md:hidden",
          open && "animate-in fade-in-0 slide-in-from-top-2 duration-200",
        )}
      >
        <PageContainer className="flex max-w-6xl flex-col gap-1 py-4">
          <nav aria-label="Mobile" className="flex flex-col">
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(linkStyles, "py-3 text-base")}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-4">
            <Button variant="outline" asChild>
              <Link href="/login" onClick={() => setOpen(false)}>
                Log in
              </Link>
            </Button>
            <PremiumButton asChild>
              <Link href="/signup" onClick={() => setOpen(false)}>
                Create account
              </Link>
            </PremiumButton>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Supabase Auth ready · social features arrive next.
          </p>
        </PageContainer>
      </div>
    </header>
  );
}
