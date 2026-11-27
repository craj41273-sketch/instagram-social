import Link from "next/link";
import {
  ClipboardList,
  Flag,
  History,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

const LINKS: AdminLink[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/appeals", label: "Appeals", icon: ShieldCheck },
  { href: "/admin/moderation", label: "Moderation", icon: ClipboardList },
  { href: "/admin/audit-logs", label: "Audit logs", icon: History },
];

/** Server-rendered section navigation shared by every admin route. */
export function AdminNav({ currentPath = "" }: { currentPath?: string }) {
  return (
    <nav aria-label="Administration sections" className="-mx-4 px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-1 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active =
            currentPath === href ||
            (href !== "/admin" && currentPath.startsWith(`${href}/`));
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
                  active ? "bg-primary/12 font-medium text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
