import Link from "next/link";
import { AdminStatusBadge, PriorityBadge } from "@/components/admin/admin-badges";
import { EmptyState } from "@/components/shared/empty-state";
import type { ReportSummary } from "@/lib/reporting/service";

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

/** Text-only rows; private narrative text stays on the detail page. */
export function ReportList({ items }: { items: ReportSummary[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No reports in this queue"
        description="Change the filters or check back when new reports arrive."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-surface/40">
      <table className="w-full min-w-44 text-left text-sm">
        <thead className="border-b border-border/70 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Report</th>
            <th scope="col" className="px-3 py-2 font-medium">Target</th>
            <th scope="col" className="px-3 py-2 font-medium">Category</th>
            <th scope="col" className="px-3 py-2 font-medium">Status</th>
            <th scope="col" className="px-3 py-2 font-medium">Priority</th>
            <th scope="col" className="px-3 py-2 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {items.map((item) => (
            <tr key={item.id} className="align-top hover:bg-accent/30">
              <td className="px-3 py-3">
                <Link
                  href={`/admin/reports/${item.id}`}
                  className="font-mono text-xs text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {shortId(item.id)}
                </Link>
              </td>
              <td className="px-3 py-3">
                <span className="block text-foreground">
                  {item.targetUsername ?? item.targetDisplayName ?? "Account reference"}
                </span>
                <span className="block font-mono text-xs text-muted-foreground">
                  {item.targetType} · {shortId(item.targetId)}
                </span>
              </td>
              <td className="px-3 py-3 text-muted-foreground">{item.category.replace(/_/g, " ")}</td>
              <td className="px-3 py-3"><AdminStatusBadge status={item.status} /></td>
              <td className="px-3 py-3"><PriorityBadge priority={item.priority} /></td>
              <td className="px-3 py-3 text-xs text-muted-foreground">
                <time dateTime={item.updatedAt}>{new Date(item.updatedAt).toLocaleDateString()}</time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
