import { StatusBadge } from "@/components/ui/status-badge";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

const STATUS_TONES: Record<string, Tone> = {
  pending: "neutral",
  reviewing: "brand",
  escalated: "warning",
  resolved: "success",
  dismissed: "neutral",
  approved: "success",
  rejected: "danger",
  active: "success",
  warning: "warning",
  restricted: "warning",
  suspended: "danger",
  banned: "danger",
};

const PRIORITY_TONES: Record<string, Tone> = {
  low: "neutral",
  normal: "brand",
  high: "warning",
  urgent: "danger",
};

function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

export function AdminStatusBadge({ status }: { status: string }) {
  return <StatusBadge tone={STATUS_TONES[status] ?? "neutral"}>{humanize(status)}</StatusBadge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <StatusBadge tone={PRIORITY_TONES[priority] ?? "neutral"}>{humanize(priority)}</StatusBadge>
  );
}

export function RiskBadge({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) {
    return <StatusBadge tone="neutral">Unassessed</StatusBadge>;
  }
  const tone: Tone = score >= 60 ? "danger" : score >= 25 ? "warning" : "neutral";
  return <StatusBadge tone={tone}>Score {score}</StatusBadge>;
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <StatusBadge tone={role === "admin" || role === "moderator" ? "brand" : "neutral"}>
      {humanize(role)}
    </StatusBadge>
  );
}
