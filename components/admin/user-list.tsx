import Link from "next/link";
import { AdminStatusBadge, RiskBadge, RoleBadge } from "@/components/admin/admin-badges";
import { EmptyState } from "@/components/shared/empty-state";
import type { AdminUserItem } from "@/lib/admin/service";

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

function trustText(user: AdminUserItem): string {
  if (user.trust.unassessed) return "Unassessed";
  return `${user.trust.fillPercent}% fill · ${user.trust.validHypes} hypes`;
}

/** Trust is community-derived and risk is admin-authored; neither is a score here. */
export function UserList({ items }: { items: AdminUserItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No accounts match these filters"
        description="Try a different username, display name, email, or account status."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-surface/40">
      <table className="w-full min-w-44 text-left text-sm">
        <thead className="border-b border-border/70 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Account</th>
            <th scope="col" className="px-3 py-2 font-medium">Email</th>
            <th scope="col" className="px-3 py-2 font-medium">Role</th>
            <th scope="col" className="px-3 py-2 font-medium">Status</th>
            <th scope="col" className="px-3 py-2 font-medium">Trust</th>
            <th scope="col" className="px-3 py-2 font-medium">Risk</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {items.map((user) => (
            <tr key={user.id} className="align-top hover:bg-accent/30">
              <td className="px-3 py-3">
                <Link
                  href={`/admin/users/${user.id}`}
                  className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {user.username}
                </Link>
                <span className="block text-xs text-muted-foreground">{user.displayName}</span>
                <span className="block font-mono text-xs text-muted-foreground">{shortId(user.id)}</span>
              </td>
              <td className="px-3 py-3 text-muted-foreground">{user.email}</td>
              <td className="px-3 py-3"><RoleBadge role={user.role} /></td>
              <td className="px-3 py-3"><AdminStatusBadge status={user.accountStatus} /></td>
              <td className="px-3 py-3 text-muted-foreground">{trustText(user)}</td>
              <td className="px-3 py-3"><RiskBadge score={user.riskScore} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
