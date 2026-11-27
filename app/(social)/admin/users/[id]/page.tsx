import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AdminStatusBadge,
  PriorityBadge,
  RiskBadge,
  RoleBadge,
} from "@/components/admin/admin-badges";
import { ModerationForm } from "@/components/admin/moderation-form";
import { RiskForm } from "@/components/admin/risk-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAdmin, requireStaffPage } from "@/lib/admin/authorization";
import { getAdminUserDetail } from "@/lib/admin/service";

export const metadata: Metadata = {
  title: "Admin account detail",
  description: "Staff review of an account's public profile, trust, risk, and moderation history.",
};

interface UserDetailPageProps {
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

function scoreText(score: number | null): string {
  return score === null ? "Unassessed" : String(score);
}

export default async function AdminUserDetailPage({ params }: UserDetailPageProps) {
  const staff = await requireStaffPage();
  const { id } = await params;
  const user = await getAdminUserDetail(id);
  if (!user) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl">{user.profile.displayName}</h2>
          <p className="mt-1 font-mono text-xs text-muted-foreground">@{user.username} · {user.id}</p>
        </div>
        <Link href="/admin/users" className="text-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">
          Back to accounts
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Account
            <RoleBadge role={user.role} />
            <AdminStatusBadge status={user.accountStatus} />
            <RiskBadge score={user.risk.score} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-border/60">
            <Meta label="Email">{user.email}</Meta>
            <Meta label="Bio">{user.profile.bio ?? "No bio supplied."}</Meta>
            <Meta label="Website">{user.profile.website ?? "Not provided"}</Meta>
            <Meta label="Location">{user.profile.location ?? "Not provided"}</Meta>
            <Meta label="Account category">{user.profile.accountCategory.replace(/_/g, " ")}</Meta>
            <Meta label="Professional roles">{user.profile.professionalRoles.length ? user.profile.professionalRoles.join(", ") : "None"}</Meta>
            <Meta label="Private account">{user.profile.isPrivate ? "Yes" : "No"}</Meta>
            <Meta label="Created"><time dateTime={user.createdAt}>{new Date(user.createdAt).toLocaleString()}</time></Meta>
            <Meta label="Updated"><time dateTime={user.updatedAt}>{new Date(user.updatedAt).toLocaleString()}</time></Meta>
            {user.suspendedUntil ? <Meta label="Suspended until"><time dateTime={user.suspendedUntil}>{new Date(user.suspendedUntil).toLocaleString()}</time></Meta> : null}
            {user.bannedAt ? <Meta label="Banned at"><time dateTime={user.bannedAt}>{new Date(user.bannedAt).toLocaleString()}</time></Meta> : null}
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Community trust</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Derived from active community hypes. Report volume never changes trust.
            </p>
            <dl className="mt-3 divide-y divide-border/60">
              <Meta label="Fill">{user.trust.unassessed ? "Unassessed" : `${user.trust.fillPercent}%`}</Meta>
              <Meta label="Valid hypes">{user.trust.unassessed ? "Unassessed" : user.trust.validHypes}</Meta>
              <Meta label="Eligible accounts">{user.trust.eligibleUsers}</Meta>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Activity counts</CardTitle></CardHeader>
          <CardContent>
            <dl className="divide-y divide-border/60">
              <Meta label="Profile links">{user.counts.links}</Meta>
              <Meta label="Projects">{user.counts.projects}</Meta>
              <Meta label="Reports against account">{user.reports.length}</Meta>
              <Meta label="Moderation actions">{user.moderationHistory.length}</Meta>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Private conversations and message text are never included in staff review.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Risk assessment
            <RiskBadge score={user.risk.score} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="divide-y divide-border/60">
            <Meta label="Score">{scoreText(user.risk.score)}</Meta>
            <Meta label="Reason">{user.risk.reason ?? "No assessment recorded."}</Meta>
            <Meta label="Evidence references">{user.risk.evidenceRefs.length ? user.risk.evidenceRefs.join(", ") : "None"}</Meta>
            <Meta label="Assessed at">{user.risk.assessedAt ? <time dateTime={user.risk.assessedAt}>{new Date(user.risk.assessedAt).toLocaleString()}</time> : "Never"}</Meta>
          </dl>
          <div>
            <h3 className="font-heading text-base">History</h3>
            {user.risk.history.length ? (
              <ul className="mt-2 space-y-2">
                {user.risk.history.map((entry) => (
                  <li key={entry.id} className="rounded-lg border border-border/70 bg-surface/40 p-3 text-sm">
                    <p className="text-xs text-muted-foreground">
                      {entry.action === "set" ? "Set" : "Removed"} · previous {scoreText(entry.previousScore)} · current {scoreText(entry.score)} ·{" "}
                      <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time>
                    </p>
                    <p className="mt-1">{entry.reason}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">By {entry.actorId}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No risk changes recorded.</p>
            )}
          </div>
          {isAdmin(staff) ? (
            <div className="border-t border-border/60 pt-4">
              <h3 className="font-heading text-base">Admin risk controls</h3>
              <div className="mt-3">
                <RiskForm
                  userId={user.id}
                  score={user.risk.score}
                  evidenceRefs={user.risk.evidenceRefs}
                />
              </div>
            </div>
          ) : (
            <p className="border-t border-border/60 pt-4 text-sm text-muted-foreground">
              Risk controls are available to administrators only.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Moderation history</CardTitle></CardHeader>
          <CardContent>
            {user.moderationHistory.length ? (
              <ul className="space-y-2">
                {user.moderationHistory.map((entry) => (
                  <li key={entry.id} className="rounded-lg border border-border/70 bg-surface/40 p-3 text-sm">
                    <p className="capitalize">{entry.action.replace(/_/g, " ")}</p>
                    <p className="mt-1 text-muted-foreground">{entry.reason}</p>
                    {entry.targetType && entry.targetId ? (
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{entry.targetType} · {entry.targetId}</p>
                    ) : null}
                    <time className="mt-1 block text-xs text-muted-foreground" dateTime={entry.createdAt}>
                      {new Date(entry.createdAt).toLocaleString()}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No moderation actions" description="Nothing has been recorded for this account." />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Reports</CardTitle></CardHeader>
          <CardContent>
            {user.reports.length ? (
              <ul className="space-y-2">
                {user.reports.map((report) => (
                  <li key={report.id} className="rounded-lg border border-border/70 bg-surface/40 p-3 text-sm">
                    <Link href={`/admin/reports/${report.id}`} className="font-mono text-xs text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                      {report.id}
                    </Link>
                    <p className="mt-1 text-muted-foreground">{report.category.replace(/_/g, " ")}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <AdminStatusBadge status={report.status} />
                      <PriorityBadge priority={report.priority} />
                    </div>
                    <time className="mt-2 block text-xs text-muted-foreground" dateTime={report.createdAt}>
                      {new Date(report.createdAt).toLocaleString()}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No reports against this account" description="Reports targeting this account will appear here." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Manual moderation</CardTitle></CardHeader>
        <CardContent><ModerationForm defaultUserId={user.id} /></CardContent>
      </Card>
    </div>
  );
}
