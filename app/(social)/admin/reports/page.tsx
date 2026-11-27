import type { Metadata } from "next";
import Link from "next/link";
import { ReportList } from "@/components/admin/report-list";
import { ReportPagination } from "@/components/admin/report-pagination";
import { FormField } from "@/components/shared/form-field";
import { PremiumButton } from "@/components/ui/premium-button";
import { Input } from "@/components/ui/input";
import { isAdmin, requireStaffPage } from "@/lib/admin/authorization";
import { logServerError } from "@/lib/logging";
import { listReports } from "@/lib/reporting/service";
import {
  REPORT_CATEGORIES,
  REPORT_PRIORITIES,
  REPORT_STATUSES,
  reportQuerySchema,
} from "@/lib/validations/reporting";
import { ErrorState } from "@/components/shared/error-state";

export const metadata: Metadata = {
  title: "Report queue",
  description: "Filter and review reports submitted by Luma members.",
};

interface ReportsPageProps {
  searchParams: Promise<{ status?: string; category?: string; priority?: string; q?: string; page?: string }>;
}

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const staff = await requireStaffPage();
  const parsed = reportQuerySchema.safeParse(await searchParams);
  const query = parsed.success ? parsed.data : { page: 1 };

  let result;
  try {
    result = await listReports({ ...query, includeReporter: isAdmin(staff) });
  } catch (error) {
    logServerError("admin.reports.list", error);
  }

  const filters = {
    status: "status" in query ? query.status : undefined,
    category: "category" in query ? query.category : undefined,
    priority: "priority" in query ? query.priority : undefined,
    q: "q" in query ? query.q : undefined,
  };
  const hasFilters = Boolean(filters.status || filters.category || filters.priority || filters.q);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl">Report queue</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Severity comes from the report category. Report volume never changes account risk or trust.
        </p>
      </div>

      <form method="get" action="/admin/reports" className="grid gap-3 rounded-xl border border-border/70 bg-surface/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <FormField id="report-filter-status" label="Status">
          <select id="report-filter-status" name="status" defaultValue={filters.status ?? ""} className={selectClass}>
            <option value="">All statuses</option>
            {REPORT_STATUSES.map((option) => <option key={option} value={option}>{option.replace(/_/g, " ")}</option>)}
          </select>
        </FormField>
        <FormField id="report-filter-category" label="Category">
          <select id="report-filter-category" name="category" defaultValue={filters.category ?? ""} className={selectClass}>
            <option value="">All categories</option>
            {REPORT_CATEGORIES.map((option) => <option key={option} value={option}>{option.replace(/_/g, " ")}</option>)}
          </select>
        </FormField>
        <FormField id="report-filter-priority" label="Priority">
          <select id="report-filter-priority" name="priority" defaultValue={filters.priority ?? ""} className={selectClass}>
            <option value="">All priorities</option>
            {REPORT_PRIORITIES.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </FormField>
        <FormField id="report-filter-q" label="Search">
          <Input id="report-filter-q" name="q" defaultValue={filters.q ?? ""} maxLength={120} placeholder="Target ID or text" />
        </FormField>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4">
          <PremiumButton type="submit" premiumVariant="soft">Apply filters</PremiumButton>
          {hasFilters ? (
            <Link href="/admin/reports" className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
              Clear filters
            </Link>
          ) : null}
        </div>
      </form>

      {result ? (
        <>
          <ReportList items={result.items} />
          <ReportPagination
            page={result.page}
            total={result.total}
            pageSize={result.pageSize}
            filters={filters}
          />
        </>
      ) : (
        <ErrorState
          title="The report queue could not load"
          description="Reports are temporarily unavailable. Please try again in a moment."
        />
      )}
    </div>
  );
}
