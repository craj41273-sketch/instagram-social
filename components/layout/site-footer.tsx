import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { getCurrentYear } from "@/components/shared/current-year";
import { Brand } from "@/components/shared/brand";
import { APP_NAME } from "@/lib/constants";

const footerGroups = [
  {
    heading: "Explore",
    links: [
      { href: "/", label: "Home" },
      { href: "/#discover", label: "Discover" },
      { href: "/#features", label: "Features" },
      { href: "/#about", label: "About" },
    ],
  },
  {
    heading: "Account",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/signup", label: "Create account" },
      { href: "/forgot-password", label: "Reset password" },
      { href: "/verify-email", label: "Verify email" },
    ],
  },
  {
    heading: "Luma",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/contact", label: "Contact" },
    ],
  },
] as const;

const linkStyles =
  "rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export async function SiteFooter() {
  const year = await getCurrentYear();

  return (
    <footer className="border-t border-border/60 py-12 sm:py-16">
      <PageContainer className="max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Brand />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              A photography-first place for your moments, your people, and your
              world.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Frontend preview · no accounts or social data are connected yet.
            </p>
          </div>

          {footerGroups.map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-foreground">
                {group.heading}
              </h2>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={linkStyles}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} {APP_NAME}. All rights reserved.
          </p>
          <p>Designed with light, restraint, and care.</p>
        </div>
      </PageContainer>
    </footer>
  );
}
