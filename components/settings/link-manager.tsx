"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import {
  addLinkAction,
  deleteLinkAction,
  reorderLinksAction,
  updateLinkAction,
} from "@/lib/static/actions";
import { initialActionState, type ActionState } from "@/lib/static/actions";
import { ActionFeedback } from "@/components/settings/action-feedback";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { PremiumButton } from "@/components/ui/premium-button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { LINK_TYPES } from "@/lib/privacy/constants";

type ServerAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

export interface ManagedLink {
  id: string;
  label: string;
  url: string;
  linkType: string;
  icon: string | null;
  enabled: boolean;
  visibility: string;
  position: number;
}

function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

function LinkFields({ prefix, defaults }: { prefix: string; defaults?: ManagedLink }) {
  return (
    <>
      <input type="hidden" name="enabled" value="false" />
      <FormField id={`${prefix}-label`} label="Label" error={undefined}>
        <Input
          id={`${prefix}-label`}
          name="label"
          defaultValue={defaults?.label}
          maxLength={80}
          placeholder="Portfolio"
          required
        />
      </FormField>
      <FormField id={`${prefix}-url`} label="URL" hint="Full http:// or https:// URL">
        <Input
          id={`${prefix}-url`}
          name="url"
          type="url"
          defaultValue={defaults?.url}
          maxLength={500}
          placeholder="https://example.com"
          required
        />
      </FormField>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id={`${prefix}-linkType`} label="Type">
          <select
            id={`${prefix}-linkType`}
            name="linkType"
            defaultValue={defaults?.linkType ?? "website"}
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {LINK_TYPES.map((type) => (
              <option key={type} value={type}>
                {humanize(type)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id={`${prefix}-icon`} label="Icon name" hint="Optional">
          <Input
            id={`${prefix}-icon`}
            name="icon"
            defaultValue={defaults?.icon ?? ""}
            maxLength={60}
            placeholder="globe"
          />
        </FormField>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id={`${prefix}-visibility`} label="Visible to">
          <select
            id={`${prefix}-visibility`}
            name="visibility"
            defaultValue={defaults?.visibility ?? "everyone"}
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="everyone">Everyone</option>
            <option value="followers">Followers</option>
          </select>
        </FormField>
        <div className="flex items-end pb-1">
          <label htmlFor={`${prefix}-enabled-checkbox`} className="flex items-center gap-2 text-sm">
            <input
              id={`${prefix}-enabled-checkbox`}
              name="enabled"
              type="checkbox"
              value="true"
              defaultChecked={defaults?.enabled ?? true}
              className="size-4 accent-primary"
            />
            Enabled
          </label>
        </div>
      </div>
    </>
  );
}

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <PremiumButton type="submit" disabled={pending} aria-busy={pending || undefined}>
      {pending ? <Spinner className="size-4 text-current" label="Adding link" /> : "Add link"}
    </PremiumButton>
  );
}

function SaveLinkButton({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex gap-2">
      <PremiumButton type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save link"}
      </PremiumButton>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

function LinkRow({
  link,
  index,
  ids,
  onDelete,
  onMove,
}: {
  link: ManagedLink;
  index: number;
  ids: string[];

  onDelete: (formData: FormData) => void;
  onMove: (formData: FormData) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateLinkAction,
    initialActionState(),
  );

  function move(direction: -1 | 1) {
    const other = index + direction;
    if (other < 0 || other >= ids.length) return;
    const next = [...ids];
    const current = next[index];
    const target = next[other];
    if (!current || !target) return;
    next[index] = target;
    next[other] = current;
    const formData = new FormData();
    formData.set("ids", JSON.stringify(next));
    onMove(formData);
  }

  if (editing) {
    return (
      <li className="rounded-xl border border-border/70 bg-surface/40 p-4">
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={link.id} />
          <LinkFields prefix={`edit-${link.id}`} defaults={link} />
          <ActionFeedback state={state} />
          <SaveLinkButton onCancel={() => setEditing(false)} />
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-surface/40 p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{link.label}</p>
        <p className="truncate text-xs text-muted-foreground">{link.url}</p>
      </div>
      <StatusBadge tone={link.enabled ? "success" : "neutral"}>
        {link.enabled ? "Enabled" : "Hidden"}
      </StatusBadge>
      <StatusBadge tone="neutral">{humanize(link.visibility)}</StatusBadge>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label={`Move ${link.label} up`}
          disabled={index === 0}
          onClick={() => move(-1)}
        >
          <ArrowUp aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label={`Move ${link.label} down`}
          disabled={index === ids.length - 1}
          onClick={() => move(1)}
        >
          <ArrowDown aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label={`Edit ${link.label}`}
          onClick={() => setEditing(true)}
        >
          <Pencil aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label={`Delete ${link.label}`}
          onClick={() => {
            const formData = new FormData();
            formData.set("id", link.id);
            onDelete(formData);
          }}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}

/** Compact add/edit/delete/reorder manager for safe external profile links. */
export function LinkManager({ links }: { links: ManagedLink[] }) {
  const [addState, addAction] = useActionState<ActionState, FormData>(
    addLinkAction,
    initialActionState(),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function run(action: ServerAction, formData: FormData) {
    startTransition(async () => {
      const result = await action(initialActionState(), formData);
      setNotice(result.message ?? null);
    });
  }

  return (
    <div className="space-y-8">
      <form action={addAction} className="space-y-3 rounded-xl border border-border/70 bg-surface/40 p-4">
        <h3 className="font-heading text-base">Add a link</h3>
        <LinkFields prefix="new" />
        <ActionFeedback state={addState} />
        <AddButton />
      </form>

      {notice ? (
        <p role="status" className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-sm">
          {notice}
        </p>
      ) : null}

      <section aria-labelledby="links-list-heading" className="space-y-3">
        <h3 id="links-list-heading" className="font-heading text-base">
          Your links
        </h3>
        {links.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/80 bg-surface/40 px-4 py-6 text-center text-sm text-muted-foreground">
            No links yet. Add one above.
          </p>
        ) : (
          <ul className="space-y-2">
            {links.map((link, index) => (
              <LinkRow
                key={link.id}
                link={link}
                index={index}
                ids={links.map((item) => item.id)}
                onDelete={(formData) => run(deleteLinkAction, formData)}
                onMove={(formData) => run(reorderLinksAction, formData)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
