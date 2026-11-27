import type { Metadata } from "next";
import Link from "next/link";
import { ModerationForm } from "@/components/admin/moderation-form";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaffPage } from "@/lib/admin/authorization";
import { getAdminDashboard } from "@/lib/admin/service";
import { logServerError } from "@/lib/logging";

export const metadata: Metadata = {
  title: "Moderation",
  description: "Manual staff moderation and its recorded action history.",
};

export default async function AdminModerationPage() {
  await requireStaffPage();

  let data;
  try {
    data = await getAdminDashboard();
  } catch (error) {
    logServerError("admin.moderation.dashboard", error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl">Manual moderation</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No automatic punishment runs from reports, trust, or risk. Actions take effect only after
          staff submit this form, and no content is auto-deleted.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Record an action</CardTitle></CardHeader>
        <CardContent><ModerationForm /></CardContent>
      </Card>

      <section aria-labelledby="moderation-history-heading" className="space-y-3">
        <h2 id="moderation-history-heading" className="font-heading text-xl">Recent recorded actions</h2>
        {!data ? (
          <ErrorState title="Recent actions could not load" description="Please try again in a moment." />
        ) : data.recentModerationActions.length ? (
          <Card>
            <CardContent className="pt-(--card-spacing)">
              <ul className="divide-y divide-border/60">
                {data.recentModerationActions.map((action) => (
                  <li key={action.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <Link
                        href={`/admin/users/${action.userId}`}
                        className="text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {action.username ?? action.userId}
                      </Link>
                      <p className="text-xs text-muted-foreground">{action.reason}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <span className="block capitalize">{action.action.replace(/_/g, " ")}</span>
                      <time dateTime={action.createdAt}>{new Date(action.createdAt).toLocaleString()}</time>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : (
          <EmptyState title="No moderation actions recorded" description="Past staff decisions will appear here." />
        )}
      </section>
    </div>
  );
}
