import type { ReactNode } from "react";
import { SensitiveSurface } from "@/components/shared/sensitive-surface";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ReportEvidenceItem } from "@/lib/reporting/service";

type LooseRecord = Record<string, unknown>;

function asRecord(value: unknown): LooseRecord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as LooseRecord;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(record: LooseRecord, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function formatTime(value: string | null): string {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Time unavailable" : date.toLocaleString();
}

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm text-foreground">{value}</dd>
    </div>
  );
}

function ChatMessage({ message, reported }: { message: LooseRecord | null; reported?: boolean }) {
  if (!message) {
    return <p className="text-sm text-muted-foreground">No message was captured.</p>;
  }
  const deleted = message.deleted === true;
  return (
    <li className="rounded-lg border border-border/70 bg-background/50 p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono">{text(message, "id") ?? "Message ID unavailable"}</span>
        <span>From {text(message, "senderId") ?? "sender unavailable"}</span>
        <time dateTime={text(message, "createdAt") ?? undefined}>
          {formatTime(text(message, "createdAt"))}
        </time>
        {reported ? <StatusBadge tone="brand">Reported message</StatusBadge> : null}
        {deleted ? <StatusBadge tone="neutral">Deleted at capture</StatusBadge> : null}
      </div>
      <p className="mt-2 text-sm whitespace-pre-wrap break-words">
        {deleted ? "Message text was removed before capture." : text(message, "content") ?? "No text captured"}
      </p>
    </li>
  );
}

function Snapshot({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border/70 bg-surface/40 p-4">
      {children}
    </section>
  );
}

/** Only known scalar fields are rendered; unexpected payload objects are ignored. */
function EvidenceBody({ item }: { item: ReportEvidenceItem }) {
  const payload = asRecord(item.payload);
  if (!payload) {
    return <p className="text-sm text-muted-foreground">This snapshot has no readable fields.</p>;
  }

  if (item.kind === "chat_snapshot") {
    const participants = asArray(payload.participants)
      .map(asRecord)
      .filter((entry): entry is LooseRecord => entry !== null);
    const surrounding = asArray(payload.surroundingMessages)
      .map(asRecord)
      .filter((entry): entry is LooseRecord => entry !== null);
    const mediaRefs = asArray(payload.mediaRefs).filter(
      (entry): entry is string => typeof entry === "string",
    );

    return (
      <div className="space-y-4">
        <dl className="divide-y divide-border/60">
          <Row label="Conversation ID" value={text(payload, "conversationId")} />
          <Row label="Reported message" value={text(payload, "reportedMessageId")} />
          <Row label="Captured at" value={formatTime(text(payload, "capturedAt"))} />
          <Row label="Category" value={text(payload, "category")?.replace(/_/g, " ") ?? null} />
          <Row label="Explanation" value={text(payload, "explanation")} />
          <Row label="Media references" value={mediaRefs.length ? mediaRefs.join(", ") : "None captured"} />
        </dl>
        <div>
          <h4 className="text-sm font-medium">Participants</h4>
          {participants.length ? (
            <ul className="mt-2 space-y-1 text-sm">
              {participants.map((participant, index) => (
                <li key={text(participant, "userId") ?? index} className="text-muted-foreground">
                  {text(participant, "username") ?? "Username unavailable"}
                  {" · "}
                  <span className="font-mono text-xs">
                    {text(participant, "userId") ?? "Account ID unavailable"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No participants were captured.</p>
          )}
        </div>
        <div>
          <h4 className="text-sm font-medium">Selected message</h4>
          <ul className="mt-2 space-y-2">
            <ChatMessage message={asRecord(payload.selectedMessage)} reported />
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium">Surrounding messages</h4>
          {surrounding.length ? (
            <ul className="mt-2 space-y-2">
              {surrounding.map((message, index) => (
                <ChatMessage
                  key={text(message, "id") ?? index}
                  message={message}
                />
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No surrounding messages were captured.</p>
          )}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Both sides of the conversation were captured at report time. Later edits or deletions
          are not reflected in this snapshot.
        </p>
      </div>
    );
  }

  return (
    <dl className="divide-y divide-border/60">
      <Row label="Target type" value={text(payload, "targetType")} />
      <Row label="Target ID" value={text(payload, "targetId")} />
      <Row label="Captured at" value={formatTime(text(payload, "capturedAt"))} />
      <Row label="Category" value={text(payload, "category")?.replace(/_/g, " ") ?? null} />
    </dl>
  );
}

/** Chat and target snapshots are sensitive; copy and drag are discouraged. */
export function EvidenceViewer({ items }: { items: ReportEvidenceItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/80 bg-surface/40 px-4 py-6 text-sm text-muted-foreground">
        No evidence was captured with this report.
      </p>
    );
  }

  return (
    <SensitiveSurface className="space-y-4">
      {items.map((item) => (
        <Snapshot key={item.id}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-base">
              {item.kind === "chat_snapshot" ? "Conversation snapshot" : "Target snapshot"}
            </h3>
            <StatusBadge tone="neutral">Captured {formatTime(item.capturedAt)}</StatusBadge>
          </div>
          <EvidenceBody item={item} />
        </Snapshot>
      ))}
    </SensitiveSurface>
  );
}
