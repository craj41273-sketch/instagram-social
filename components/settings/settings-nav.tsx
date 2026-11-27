import Link from "next/link";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
}

const SECTIONS: Array<{ title: string; links: NavLink[] }> = [
  {
    title: "Settings",
    links: [{ href: "/settings", label: "Overview" }],
  },
  {
    title: "Privacy",
    links: [
      { href: "/settings/privacy", label: "Privacy overview" },
      { href: "/settings/privacy/account", label: "Account" },
      { href: "/settings/privacy/stories", label: "Stories" },
      { href: "/settings/privacy/messages", label: "Messages" },
      { href: "/settings/privacy/comments", label: "Comments" },
      { href: "/settings/privacy/tags-and-mentions", label: "Tags and mentions" },
      { href: "/settings/privacy/hidden-words", label: "Hidden words" },
      { href: "/settings/privacy/blocked", label: "Blocked" },
      { href: "/settings/privacy/restricted", label: "Restricted" },
      { href: "/settings/privacy/muted", label: "Muted" },
      { href: "/settings/follow-requests", label: "Follow requests" },
      { href: "/settings/notifications", label: "Notifications" },
    ],
  },
  {
    title: "Professional",
    links: [
      { href: "/settings/professional", label: "Profile" },
      { href: "/settings/links", label: "Links" },
      { href: "/settings/projects", label: "Projects" },
    ],
  },
];

/** Plain links with an optional active path; navigation is wired by the parent. */
export function SettingsNav({ currentPath }: { currentPath?: string }) {
  return (
    <div className="space-y-5">
      {SECTIONS.map((section) => (
        <section key={section.title} aria-label={section.title} className="space-y-1">
          <h2 className="px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {section.title}
          </h2>
          <ul className="space-y-0.5">
            {section.links.map((link) => {
              const active = currentPath === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
                      active
                        ? "bg-primary/12 font-medium text-primary"
                        : "text-muted-foreground",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
