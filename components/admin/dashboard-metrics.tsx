import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData } from "@/lib/admin/service";

interface Metric {
  label: string;
  value: number;
  href: string;
}

/** Counts are read from the dashboard service; nothing here is illustrative. */
export function DashboardMetrics({ data }: { data: DashboardData }) {
  const metrics: Metric[] = [
    { label: "Total users", value: data.totalUsers, href: "/admin/users" },
    { label: "Active accounts", value: data.activeUsers, href: "/admin/users?status=active" },
    {
      label: "Pending reports",
      value: data.pendingReports,
      href: "/admin/reports?status=pending",
    },
    {
      label: "Reports under review",
      value: data.reportsUnderReview,
      href: "/admin/reports?status=reviewing",
    },
    {
      label: "Escalated reports",
      value: data.escalatedReports,
      href: "/admin/reports?priority=urgent",
    },
    {
      label: "Resolved reports",
      value: data.resolvedReports,
      href: "/admin/reports?status=resolved",
    },
    {
      label: "Suspended accounts",
      value: data.suspendedAccounts,
      href: "/admin/users?status=suspended",
    },
    { label: "Banned accounts", value: data.bannedAccounts, href: "/admin/users?status=banned" },
    { label: "Pending appeals", value: data.pendingAppeals, href: "/admin/appeals" },
  ];

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((metric) => (
        <li key={metric.label}>
          <Link
            href={metric.href}
            className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="h-full transition-colors hover:bg-accent/40">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-heading text-2xl tabular-nums">{metric.value.toLocaleString()}</p>
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
