import type { Metadata } from "next";
import { z } from "zod";
import { AuditLogList } from "@/components/admin/audit-log-list";
import { requireStaffPage } from "@/lib/admin/authorization";
import { listAuditLogs } from "@/lib/admin/service";
import { logServerError } from "@/lib/logging";

export const metadata: Metadata = {
  title: "Audit logs",
  description: "Sanitized staff action history with actor, entity, and time.",
};

export default async function AdminAuditLogsPage() {
  await requireStaffPage();
  const raw: Record<string, string | undefined> = {};
  const parsed = z.coerce.number().int().min(1).max(10_000).safeParse(raw.page ?? "1");
  const page = parsed.success ? parsed.data : 1;

  let result;
  try {
    result = await listAuditLogs(page);
  } catch (error) {
    logServerError("admin.auditLogs.list", error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl">Audit logs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Details are already sanitized by the service; private message text and evidence notes are
          never written here.
        </p>
      </div>
      {result ? (
        <AuditLogList
          items={result.items}
          page={result.page}
          total={result.total}
          pageSize={result.pageSize}
        />
      ) : (
        <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/[0.04] p-4 text-sm text-destructive">
          Audit logs could not load. Please try again in a moment.
        </p>
      )}
    </div>
  );
}
