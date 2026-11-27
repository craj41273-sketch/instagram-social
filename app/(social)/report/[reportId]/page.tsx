import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageContainer } from "@/components/layout/page-container";
import { SensitiveSurface } from "@/components/shared/sensitive-surface";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireProfile } from "@/lib/auth/dal";
import { getReportStatusForReporter } from "@/lib/reporting/service";
import type { ReportStatus } from "@/lib/reporting/service";

interface ReportStatusPageProps {
  params: Promise<{ reportId: string }>;
}

function toneFor(status: ReportStatus): "neutral" | "success" | "warning" {
  if (status === "resolved") return "success";
  if (status === "pending" || status === "reviewing" || status === "escalated") {
    return "warning";
  }
  return "neutral";
}

/** Content-free report status for the reporter; unknown references do not resolve. */
export default async function ReportStatusPage({ params }: ReportStatusPageProps) {
  const current = await requireProfile();
  const { reportId } = await params;
  if (!z.uuid().safeParse(reportId).success) notFound();
  const status = await getReportStatusForReporter(current.user.id, reportId);
  if (!status) notFound();

  return (
    <PageContainer className="max-w-2xl">
      <SensitiveSurface>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report status</CardTitle>
            <CardDescription>
              Only the status and reference are shown here. Evidence and target
              details stay with authorised staff.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface/60 p-4">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <StatusBadge tone={toneFor(status)} className="mt-1 capitalize">
                  {status.replaceAll("_", " ")}
                </StatusBadge>
              </div>
              <div className="min-w-0 text-right">
                <p className="text-xs text-muted-foreground">Reference</p>
                <p className="mt-1 break-all font-mono text-xs">{reportId}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Screenshots or recordings of this page cannot be technically prevented.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/appeals"
                className="rounded-md text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              >
                Go to appeals
              </Link>
              <Link
                href="/posts"
                className="rounded-md text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              >
                Back to posts
              </Link>
            </div>
          </CardContent>
        </Card>
      </SensitiveSurface>
    </PageContainer>
  );
}
