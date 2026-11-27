import Link from "next/link";
import { AppealForm } from "@/components/reporting/appeal-form";
import { PageContainer } from "@/components/layout/page-container";
import { SensitiveSurface } from "@/components/shared/sensitive-surface";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireProfile } from "@/lib/auth/dal";
import { listMyAppeals, listMyReports } from "@/lib/reporting/service";

function toneFor(status: string): "neutral" | "success" | "warning" | "danger" {
  if (status === "resolved" || status === "approved") return "success";
  if (status === "rejected" || status === "dismissed") return "danger";
  if (status === "pending" || status === "reviewing" || status === "escalated") {
    return "warning";
  }
  return "neutral";
}

/** Reporter-facing history and appeal intake; no evidence or chat text is shown. */
export default async function AppealsPage() {
  const current = await requireProfile();
  const [reports, appeals] = await Promise.all([
    listMyReports(current.user.id),
    listMyAppeals(current.user.id),
  ]);

  return (
    <PageContainer className="max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl tracking-tight sm:text-3xl">Reports and appeals</h1>
        <p className="text-sm text-muted-foreground">
          Follow the status of your reports and appeal a moderation decision.
        </p>
      </header>

      <SensitiveSurface className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your reports</CardTitle>
            <CardDescription>
              Statuses only. References link to a content-free status page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <p className="text-sm text-muted-foreground">You have not submitted a report yet.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {reports.map((report) => (
                  <li
                    key={report.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/report/${report.id}`}
                        className="break-all font-mono text-xs text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {report.id}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Submitted {new Date(report.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusBadge tone={toneFor(report.status)} className="capitalize">
                      {report.status.replaceAll("_", " ")}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submit an appeal</CardTitle>
            <CardDescription>
              Explain what should be reconsidered. An approved appeal can restore the
              referenced moderation action, and every decision is recorded.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AppealForm
              reports={reports.map((report) => ({
                id: report.id,
                status: report.status,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your appeals</CardTitle>
            <CardDescription>
              Your own explanation and the moderation decision being challenged.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {appeals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No appeals submitted yet.</p>
            ) : (
              <ul className="space-y-4">
                {appeals.map((appeal) => (
                  <li key={appeal.id} className="rounded-xl border border-border/70 bg-surface/50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {new Date(appeal.createdAt).toLocaleString()}
                      </p>
                      <StatusBadge tone={toneFor(appeal.status)} className="capitalize">
                        {appeal.status}
                      </StatusBadge>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {appeal.reason}
                    </p>
                    {appeal.action ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Referenced decision: {appeal.action.action.replaceAll("_", " ")} —{" "}
                        {appeal.action.reason}
                      </p>
                    ) : null}
                    {appeal.resolution ? (
                      <p className="mt-2 text-sm text-foreground/85">{appeal.resolution}</p>
                    ) : null}
                    {appeal.reviewedAt ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Reviewed {new Date(appeal.reviewedAt).toLocaleString()}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          This page discourages copying, but screenshots and screen recordings cannot
          be technically prevented.
        </p>
      </SensitiveSurface>
    </PageContainer>
  );
}
