import Link from "next/link";

interface ReportFilters {
  status?: string;
  category?: string;
  priority?: string;
  q?: string;
}

function filterHref(filters: ReportFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.category) params.set("category", filters.category);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.q) params.set("q", filters.q);
  params.set("page", String(page));
  return `/admin/reports?${params.toString()}`;
}

/** Keeps every active filter when moving between report pages. */
export function ReportPagination({
  page,
  total,
  pageSize,
  filters,
}: {
  page: number;
  total: number;
  pageSize: number;
  filters: ReportFilters;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const previousDisabled = page <= 1;
  const nextDisabled = page >= pages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground">
        Page {page} of {pages} · {total.toLocaleString()} reports
      </p>
      <div className="flex gap-2">
        {previousDisabled ? (
          <span aria-disabled="true" className="rounded-lg border border-border/70 px-3 py-1.5 text-muted-foreground">
            Previous
          </span>
        ) : (
          <Link
            href={filterHref(filters, page - 1)}
            rel="prev"
            className="rounded-lg border border-border/70 px-3 py-1.5 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
          >
            Previous
          </Link>
        )}
        {nextDisabled ? (
          <span aria-disabled="true" className="rounded-lg border border-border/70 px-3 py-1.5 text-muted-foreground">
            Next
          </span>
        ) : (
          <Link
            href={filterHref(filters, page + 1)}
            rel="next"
            className="rounded-lg border border-border/70 px-3 py-1.5 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
