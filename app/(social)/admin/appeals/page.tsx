import type { Metadata } from "next";
import { AppealDecisionForm } from "@/components/admin/appeal-decision-form";
import { AdminStatusBadge } from "@/components/admin/admin-badges";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaffPage } from "@/lib/admin/authorization";
import { listAppeals } from "@/lib/admin/service";
import { logServerError } from "@/lib/logging";

export const metadata: Metadata = {
  title: "Appeals",
  description: "Staff review of moderation appeals and recorded resolutions.",
};

export default async function AdminAppealsPage() {
  await requireStaffPage();

  let appeals;
  try {
    appeals = await listAppeals();
  } catch (error) {
    logServerError("admin.appeals.list", error);
  }

  if (!appeals) {
    return <ErrorState title="Appeals could not load" description="Please try again in a moment." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl">Appeals</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Approving an appeal restores the linked action through the server service. Decisions are
          explicit and recorded; no content is auto-deleted.
        </p>
      </div>
      {appeals.length ? (
        <ul className="space-y-4">
          {appeals.map((appeal) => (
            <li key={appeal.id}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    {appeal.username}
                    <AdminStatusBadge status={appeal.status} />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <dl className="divide-y divide-border/60 text-sm">
                    <div className="grid gap-1 py-2 sm:grid-cols-[11rem_1fr] sm:gap-4">
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Reason</dt>
                      <dd className="whitespace-pre-wrap break-words">{appeal.reason}</dd>
                    </div>
                    <div className="grid gap-1 py-2 sm:grid-cols-[11rem_1fr] sm:gap-4">
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Resolution</dt>
                      <dd className="whitespace-pre-wrap break-words">{appeal.resolution || "Not yet recorded"}</dd>
                    </div>
                    <div className="grid gap-1 py-2 sm:grid-cols-[11rem_1fr] sm:gap-4">
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Submitted</dt>
                      <dd><time dateTime={appeal.createdAt}>{new Date(appeal.createdAt).toLocaleString()}</time></dd>
                    </div>
                    {appeal.reviewedAt ? (
                      <div className="grid gap-1 py-2 sm:grid-cols-[11rem_1fr] sm:gap-4">
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Reviewed</dt>
                        <dd><time dateTime={appeal.reviewedAt}>{new Date(appeal.reviewedAt).toLocaleString()}</time></dd>
                      </div>
                    ) : null}
                  </dl>
                  <div className="border-t border-border/60 pt-4">
                    <AppealDecisionForm appealId={appeal.id} />
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No appeals submitted" description="Appeals will appear here when members request a review." />
      )}
    </div>
  );
}
