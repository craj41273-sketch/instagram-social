import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/page-container";
import { SettingsNav } from "@/components/settings/settings-nav";

/** Shared settings shell with a sidebar-style, Tabs-like section nav. */
export function SettingsPage({
  title,
  description,
  currentPath,
  children,
}: {
  title: string;
  description: string;
  currentPath: string;
  children: ReactNode;
}) {
  return (
    <PageContainer className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl tracking-tight sm:text-3xl">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
        <nav aria-label="Settings sections" className="lg:sticky lg:top-24">
          <Card size="sm">
            <CardContent className="p-2">
              <SettingsNav currentPath={currentPath} />
            </CardContent>
          </Card>
        </nav>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
