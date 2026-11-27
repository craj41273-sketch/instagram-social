import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AdminStatusBadge,
  PriorityBadge,
} from "@/components/admin/admin-badges";
import { EvidenceNoteForm } from "@/components/admin/evidence-note-form";
import { EvidenceViewer } from "@/components/admin/evidence-viewer";
import { ModerationForm } from "@/components/admin/moderation-form";
import { ReportUpdateForm } from "@/components/admin/report-update-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAdmin, requireStaffPage } from "@/lib/admin/authorization";
import { getReportDetail } from "@/lib/reporting/service";

export const metadata: Metadata = {
  title: "Report detail",
  description: "Staff-only review of a report, its captured evidence, and workflow.",
};

interface ReportDetailPageProps {
  params: Promise<{ id: string }>;
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm">{children}</dd>
    </div>
  );
}

export default async function ReportDetailPage({ params }: ReportDetailPageProps) {
  const staff = await requireStaffPage();
  const { id } = await params;
  const report = await getReportDetail(id, staff.userId);
  if (!report) notFound();

  const preBoundUserId = report.targetType === "user" ? report.targetId : "";
  const contentTarget = report.targetType !== "user";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl">Report review</h2>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{report.id}</p>
        </div>
        <Link href="/admin/reports" className="text-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">
          Back to reports
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Report metadata
            <AdminStatusBadge status={report.status} />
            <PriorityBadge priority={report.priority} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-border/60">
            <Meta label="Category">{report.category.replace(/_/g, " ")}</Meta>
            <Meta label="Target">
              <span>{report.targetUsername ?? report.targetDisplayName ?? "Account reference"}</span>
              <span className="block font-mono text-xs text-muted-foreground">
                {report.targetType} · {report.targetId}
              </span>
            </Meta>
            <Meta label="Reason">{report.reason ?? "No short reason supplied."}</Meta>
            <Meta label="Assignee ID">{report.assigneeId ?? "Unassigned"}</Meta>
            <Meta label="Created"><time dateTime={report.createdAt}>{new Date(report.createdAt).toLocaleString()}</time></Meta>
            <Meta label="Updated"><time dateTime={report.updatedAt}>{new Date(report.updatedAt).toLocaleString()}</time></Meta>
            {report.resolvedAt ? (
              <Meta label="Resolved"><time dateTime={report.resolvedAt}>{new Date(report.resolvedAt).toLocaleString()}</time></Meta>
            ) : null}
            {isAdmin(staff) && report.reporterId ? (
              <Meta label="Reporter account ID">
                <span className="font-mono text-xs">{report.reporterId}</span>
              </Meta>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Reporter explanation</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap break-words text-foreground">
            {report.explanation || "No explanation was supplied."}
          </p>
          {report.resolutionNotes ? (
            <p className="mt-4 border-t border-border/60 pt-4 text-sm text-muted-foreground">
              Resolution notes: {report.resolutionNotes}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <section aria-labelledby="report-evidence-heading" className="space-y-3">
        <h2 id="report-evidence-heading" className="font-heading text-xl">Evidence</h2>
        <EvidenceViewer items={report.evidence} />
      </section>

      <section aria-labelledby="report-notes-heading" className="space-y-3">
        <h2 id="report-notes-heading" className="font-heading text-xl">Staff notes</h2>
        {report.notes.length ? (
          <ul className="space-y-2">
            {report.notes.map((note) => (
              <li key={note.id} className="rounded-xl border border-border/70 bg-surface/40 p-3">
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{note.actorId}</span> ·{" "}
                  <time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleString()}</time>
                </p>
                <p className="mt-2 text-sm whitespace-pre-wrap break-words">{note.note}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No staff notes yet" description="Add a note after reviewing the evidence." />
        )}
        <Card>
          <CardHeader><CardTitle>Add a note</CardTitle></CardHeader>
          <CardContent><EvidenceNoteForm reportId={report.id} /></CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader><CardTitle>Update report</CardTitle></CardHeader>
        <CardContent>
          <ReportUpdateForm
            reportId={report.id}
            status={report.status}
            priority={report.priority}
            assigneeId={report.assigneeId}
            resolutionNotes={report.resolutionNotes}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Moderation review</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {contentTarget
              ? "This report does not resolve to an account. Enter the account ID you are reviewing before recording an action."
              : "The account below is taken from the report target; an action is recorded only when you submit."}
          </p>
          <ModerationForm
            defaultUserId={preBoundUserId}
            defaultReportId={report.id}
            defaultTargetType={contentTarget ? report.targetType : undefined}
            defaultTargetId={contentTarget ? report.targetId : undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}
