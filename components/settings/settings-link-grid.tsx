import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";

/** Compact overview grid for settings subsections. */
export function SettingsLinkGrid({
  links,
}: {
  links: Array<{ href: string; title: string; description: string }>;
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className="block rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Card className="h-full p-4 transition-colors hover:bg-accent/60">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{link.title}</span>
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {link.description}
              </p>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
