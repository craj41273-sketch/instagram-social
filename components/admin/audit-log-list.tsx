import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import type { AuditLogItem } from "@/lib/admin/service";

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Time unavailable" : date.toLocaleString();
}

function detailText(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

/** Details arrive sanitized from the service; render scalars as plain text. */
export function AuditLogList({
  items,
  page,
  total,
  pageSize,
}: {
  items: AuditLogItem[];
  page: number;
  total: number;
  pageSize: number;
}) {
  if (items.length === 0) {
    return <EmptyState title="No audit entries yet" description="Actions will appear here as staff record them." />;
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border/70 bg-surface/40">
        <table className="w-full min-w-44 text-left text-sm">
          <thead className="border-b border-border/70 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Actor</th>
              <th scope="col" className="px-3 py-2 font-medium">Action</th>
              <th scope="col" className="px-3 py-2 font-medium">Entity</th>
              <th scope="col" className="px-3 py-2 font-medium">Time</th>
              <th scope="col" className="px-3 py-2 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {items.map((item) => (
              <tr key={item.id} className="align-top hover:bg-accent/30">
                <td className="px-3 py-3">
                  <span className="block text-foreground">{item.actorUsername ?? "Unknown actor"}</span>
                  <span className="block font-mono text-xs text-muted-foreground">{item.actorId}</span>
                </td>
                <td className="px-3 py-3 text-muted-foreground">{item.action.replace(/_/g, " ")}</td>
                <td className="px-3 py-3">
                  <span className="block text-muted-foreground">{item.entityType}</span>
                  <span className="block font-mono text-xs text-muted-foreground">{item.entityId}</span>
                </td>
                <td className="px-3 py-3 text-xs text-muted-foreground">
                  <time dateTime={item.createdAt}>{formatTime(item.createdAt)}</time>
                </td>
                <td className="px-3 py-3 text-xs text-muted-foreground">
                  {Object.entries(item.details)
                    .map(([key, value]) => {
                      const text = detailText(value);
                      return text ? `${key.replace(/_/g, " ")}: ${text}` : null;
                    })
                    .filter((text): text is string => text !== null)
                    .join(" · ") || "No details"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">
          Page {page} of {pages} · {total.toLocaleString()} entries
        </p>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={`/admin/audit-logs?page=${page - 1}`}
              rel="prev"
              className="rounded-lg border border-border/70 px-3 py-1.5 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
            >
              Previous
            </Link>
          ) : (
            <span aria-disabled="true" className="rounded-lg border border-border/70 px-3 py-1.5 text-muted-foreground">Previous</span>
          )}
          {page < pages ? (
            <Link
              href={`/admin/audit-logs?page=${page + 1}`}
              rel="next"
              className="rounded-lg border border-border/70 px-3 py-1.5 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
            >
              Next
            </Link>
          ) : (
            <span aria-disabled="true" className="rounded-lg border border-border/70 px-3 py-1.5 text-muted-foreground">Next</span>
          )}
        </div>
      </div>
    </div>
  );
}
