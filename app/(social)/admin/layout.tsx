import type { ReactNode } from "react";
import { headers } from "next/headers";
import { AdminNav } from "@/components/admin/admin-nav";
import { PageContainer } from "@/components/layout/page-container";
import { isAdmin, requireStaffPage } from "@/lib/admin/authorization";

/** Non-staff never reach the shell: the page guard redirects before rendering. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const staff = await requireStaffPage();
  const headerList = await headers();
  // shortcut: x-pathname only exists when a proxy supplies it; without it no
  // nav item is marked active, which does not affect access or navigation.
  const currentPath = headerList.get("x-pathname") ?? "";

  return (
    <PageContainer className="space-y-6 pb-4">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.18em] text-primary">Staff workspace</p>
        <h1 className="font-heading text-2xl tracking-tight sm:text-3xl">Administration</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {staff.username} · {isAdmin(staff) ? "Administrator" : "Moderator"}. Risk
          controls are admin-only; trust is community-derived and never changes from report volume.
        </p>
      </header>
      <AdminNav currentPath={currentPath} />
      {children}
    </PageContainer>
  );
}
