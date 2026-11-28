import type { Metadata } from "next";
import Link from "next/link";
import { UserList } from "@/components/admin/user-list";
import { FormField } from "@/components/shared/form-field";
import { ErrorState } from "@/components/shared/error-state";
import { PremiumButton } from "@/components/ui/premium-button";
import { Input } from "@/components/ui/input";
import { requireStaffPage } from "@/lib/admin/authorization";
import { listAdminUsers } from "@/lib/admin/service";
import { logServerError } from "@/lib/logging";
import { adminUserQuerySchema } from "@/lib/validations/admin";

export const metadata: Metadata = {
  title: "Admin users",
  description: "Staff view of accounts, trust, and admin-authored risk assessments.",
};

const STATUSES = ["active", "warning", "restricted", "suspended", "banned"] as const;
const selectClass =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function pageHref(q: string | undefined, status: string | undefined, page: number): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  params.set("page", String(page));
  return `/admin/users?${params.toString()}`;
}

export default async function AdminUsersPage() {
  await requireStaffPage();
  const parsed = adminUserQuerySchema.safeParse({});
  const query = parsed.success ? parsed.data : { page: 1 };
  const q = "q" in query ? query.q : undefined;
  const status = "status" in query ? query.status : undefined;

  let result;
  try {
    result = await listAdminUsers(query);
  } catch (error) {
    logServerError("admin.users.list", error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl">Accounts</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Trust is community-derived. Risk is admin-only; unassessed accounts have no score, not zero.
        </p>
      </div>

      <form method="get" action="/admin/users" className="grid gap-3 rounded-xl border border-border/70 bg-surface/40 p-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
        <FormField id="user-filter-q" label="Search">
          <Input id="user-filter-q" name="q" defaultValue={q ?? ""} maxLength={80} placeholder="Username, name, or email" />
        </FormField>
        <FormField id="user-filter-status" label="Account status">
          <select id="user-filter-status" name="status" defaultValue={status ?? ""} className={selectClass}>
            <option value="">All statuses</option>
            {STATUSES.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </FormField>
        <PremiumButton type="submit" premiumVariant="soft">Search</PremiumButton>
      </form>

      {result ? (
        <>
          <UserList items={result.items} />
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-muted-foreground">
              Page {result.page} of {Math.max(1, Math.ceil(result.total / result.pageSize))} ·{" "}
              {result.total.toLocaleString()} accounts
            </p>
            <div className="flex gap-2">
              {result.page > 1 ? (
                <Link href={pageHref(q, status, result.page - 1)} rel="prev" className="rounded-lg border border-border/70 px-3 py-1.5 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">Previous</Link>
              ) : (
                <span aria-disabled="true" className="rounded-lg border border-border/70 px-3 py-1.5 text-muted-foreground">Previous</span>
              )}
              {result.page * result.pageSize < result.total ? (
                <Link href={pageHref(q, status, result.page + 1)} rel="next" className="rounded-lg border border-border/70 px-3 py-1.5 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">Next</Link>
              ) : (
                <span aria-disabled="true" className="rounded-lg border border-border/70 px-3 py-1.5 text-muted-foreground">Next</span>
              )}
            </div>
          </div>
        </>
      ) : (
        <ErrorState
          title="Accounts could not load"
          description="The account directory is temporarily unavailable. Please try again in a moment."
        />
      )}
    </div>
  );
}
