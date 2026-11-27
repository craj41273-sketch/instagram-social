import { getRiskAssessment } from "@/lib/admin/service";
import { parseUserId } from "@/lib/db/profile-sql";
import { logServerError } from "@/lib/logging";
import { getTrustStats } from "@/lib/trust/service";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

interface Band {
  label: string;
  bar: string;
  text: string;
}

/** Neutral is unassessed; the four colour bands are ordinal risk labels only. */
function riskBand(score: number | null): Band {
  if (score === null) {
    return { label: "Not assessed", bar: "bg-muted", text: "text-muted-foreground" };
  }
  if (score < 25) return { label: "Low", bar: "bg-success", text: "text-success" };
  if (score < 50) return { label: "Moderate", bar: "bg-warning", text: "text-warning" };
  if (score < 75) return { label: "Elevated", bar: "bg-chart-4", text: "text-chart-4" };
  return { label: "High", bar: "bg-destructive", text: "text-destructive" };
}

function Meter({
  label,
  percent,
  unassessed,
  note,
  bar,
  text,
  bandLabel,
}: {
  label: string;
  percent: number;
  unassessed: boolean;
  note: string;
  bar: string;
  text: string;
  bandLabel: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-surface/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <StatusBadge tone={unassessed ? "neutral" : "brand"}>
          {unassessed ? "Unassessed" : bandLabel}
        </StatusBadge>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={unassessed ? 0 : percent}
        aria-valuetext={unassessed ? `${label} is unassessed` : `${percent} percent, ${bandLabel}`}
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn("h-full rounded-full", unassessed ? "bg-muted" : bar)}
          style={{ width: `${unassessed ? 0 : percent}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
        <span>{note}</span>
        <span className={cn("font-medium tabular-nums", unassessed ? "text-muted-foreground" : text)}>
          {unassessed ? "—" : `${percent}%`}
        </span>
      </div>
    </div>
  );
}

/**
 * Trust and admin risk are independent signals. Neither is derived from the
 * other, and neither is a guarantee of safety or conduct.
 */
export async function ReputationBars({
  targetId,
  viewerId,
}: {
  targetId: string;
  viewerId: string | null;
}) {
  let trust = null;
  let risk = null;

  try {
    trust = await getTrustStats(targetId, viewerId);
  } catch (error) {
    logServerError("reputation.trust", error, { userId: targetId });
  }

  try {
    if (parseUserId(targetId)) {
      risk = await getRiskAssessment(targetId);
    }
  } catch (error) {
    logServerError("reputation.risk", error, { userId: targetId });
  }

  const trustUnassessed = !trust || trust.unassessed;
  const riskUnassessed = !risk || risk.score === null;
  const band = riskBand(risk?.score ?? null);

  return (
    <section aria-labelledby="reputation-heading" className="rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-5">
      <div className="mb-4">
        <h2 id="reputation-heading" className="font-heading text-lg tracking-tight">
          Reputation signals
        </h2>
        <p className="text-xs text-muted-foreground">
          Two separate, non-guaranteed signals derived from real account records.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Meter
          label="Community trust"
          percent={trust?.fillPercent ?? 0}
          unassessed={trustUnassessed}
          note={
            trust
              ? `${trust.validHypes} active hypes from eligible accounts`
              : "Trust could not be loaded right now"
          }
          bar="bg-success"
          text="text-success"
          bandLabel={trustUnassessed ? "Unassessed" : "Community trust"}
        />
        <Meter
          label="Admin risk"
          percent={risk?.score ?? 0}
          unassessed={riskUnassessed}
          note={
            risk?.score === null || !risk
              ? "No admin assessment on record"
              : "Admin-set assessment from reports and evidence"
          }
          bar={band.bar}
          text={band.text}
          bandLabel={band.label}
        />
      </div>

      <details className="mt-4 rounded-xl border border-border/60 bg-surface/40 p-3 text-xs leading-relaxed text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">
          How these signals work
        </summary>
        <div className="mt-3 space-y-2">
          <p>
            Community trust is valid hypes divided by 20% of eligible active accounts,
            capped at 100%. Withdrawn hypes are excluded, and banned or suspended
            accounts are excluded on both sides. New accounts with no active hypes show
            as unassessed.
          </p>
          <p>
            You can withdraw your own hype at any time. Trust is a community signal,
            not a verification, endorsement, or guarantee of conduct.
          </p>
          <p>
            Admin risk is set by administrators from reports and evidence; it is never
            calculated from hypes or community trust. Bands run from green (low) through
            yellow (moderate), orange (elevated), to red (high). No stored assessment
            means unassessed, shown in neutral grey.
          </p>
        </div>
      </details>
    </section>
  );
}
