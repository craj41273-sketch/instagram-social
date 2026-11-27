import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Flag, ShieldAlert } from "lucide-react";
import { DashboardMetrics } from "@/components/admin/dashboard-metrics";
import { AdminStatusBadge, PriorityBadge } from "@/components/admin/admin-badges";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaffPage } from "@/lib/admin/authorization";
import { getAdminDashboard } from "@/lib/admin/service";
import { logServerError } from "@/lib/logging";

export const metadata: Metadata = {
  title: "Administration overview",
  description: "Real staff metrics, priority reports, and recent moderation actions.",
};

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

export default async function AdminOverviewPage() {
  await requireStaffPage();

  let data;
  try {
    data = await getAdminDashboard();
  } catch (error) {
    logServerError("admin.page.dashboard", error);
  }

  if (!data) {
    return (
      <ErrorState
        title="The dashboard could not load"
        description="Staff metrics are temporarily unavailable. Please try again in a moment."
      />
    );
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="admin-metrics-heading" className="space-y-4">
        <div>
          <h2 id="admin-metrics-heading" className="font-heading text-xl">Queues at a glance</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Counts come from current accounts, reports, and appeals. No content is removed automatically.
          </p>
        </div>
        <DashboardMetrics data={data} />
      </section>

      <section aria-labelledby="admin-priority-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="admin-priority-heading" className="font-heading text-xl">Priority safety issues</h2>
          <Link href="/admin/reports?priority=urgent" className="text-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">
            Open urgent reports
          </Link>
        </div>
        {data.prioritySafetyIssues.length ? (
          <Card>
            <CardContent className="pt-(--card-spacing)">
              <ul className="divide-y divide-border/60">
                {data.prioritySafetyIssues.map((issue) => (
                  <li key={issue.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <Link
                        href={`/admin/reports/${issue.id}`}
                        className="font-mono text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {shortId(issue.id)}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {issue.category.replace(/_/g, " ")} · {issue.targetType} {shortId(issue.targetId)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <AdminStatusBadge status={issue.status} />
                      <PriorityBadge priority={issue.priority} />
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            icon={ShieldAlert}
            title="No priority safety issues are open"
            description="Urgent and high-priority reports will appear here while they await review."
          />
        )}
      </section>

      <section aria-labelledby="admin-actions-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="admin-actions-heading" className="font-heading text-xl">Recent moderation actions</h2>
          <Link href="/admin/moderation" className="text-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">
            Manual review
          </Link>
        </div>
        {data.recentModerationActions.length ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                <ClipboardList className="size-4" aria-hidden="true" />
                Recorded by staff
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border/60">
                {data.recentModerationActions.map((action) => (
                  <li key={action.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <Link
                        href={`/admin/users/${action.userId}`}
                        className="text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {action.username ?? shortId(action.userId)}
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
          <EmptyState
            icon={Flag}
            title="No moderation actions recorded yet"
            description="Actions appear here only after staff record them."
          />
        )}
      </section>
    </div>
  );
}
