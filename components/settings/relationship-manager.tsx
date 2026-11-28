"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { setRelationshipAction } from "@/lib/static/actions";
import { initialActionState, type ActionState } from "@/lib/static/actions";
import { ActionFeedback } from "@/components/settings/action-feedback";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { FormField } from "@/components/shared/form-field";
import { PremiumButton } from "@/components/ui/premium-button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { RELATIONSHIP_KINDS } from "@/lib/privacy/constants";

type RelationshipKind = (typeof RELATIONSHIP_KINDS)[number];

export interface ManagedRelationship {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <PremiumButton
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className="min-w-24"
    >
      {pending ? <Spinner className="size-4 text-current" label="Adding" /> : "Add"}
    </PremiumButton>
  );
}

function RemoveButton() {
  const { pending } = useFormStatus();
  return (
    <PremiumButton
      type="submit"
      premiumVariant="danger"
      size="xs"
      disabled={pending}
      aria-label={pending ? "Removing" : "Remove"}
    >
      {pending ? <Spinner className="size-3 text-current" label="Removing" /> : "Remove"}
    </PremiumButton>
  );
}

function RemoveRow({
  item,
  kind,
}: {
  item: ManagedRelationship;
  kind: RelationshipKind;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    setRelationshipAction,
    initialActionState(),
  );

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-surface/40 p-3">
      <ProfileAvatar name={item.displayName} src={item.avatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.displayName}</p>
        <p className="truncate text-xs text-muted-foreground">@{item.username}</p>
      </div>
      <form action={formAction} className="flex flex-col items-end gap-1">
        <input type="hidden" name="username" value={item.username} />
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="intent" value="remove" />
        <RemoveButton />
        {state.status === "error" && state.message ? (
          <span role="alert" className="text-xs text-destructive">
            {state.message}
          </span>
        ) : null}
      </form>
    </li>
  );
}

/** Add and remove block/restrict/mute edges with session-derived ownership. */
export function RelationshipManager({
  kind,
  items,
}: {
  kind: RelationshipKind;
  items: ManagedRelationship[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    setRelationshipAction,
    initialActionState(),
  );

  return (
    <div className="space-y-6">
      <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="intent" value="add" />
        <FormField
          id={`${kind}-username`}
          label={`Add a ${kind}`}
          hint="Enter an exact Luma username."
          error={state.errors?.username}
          className="flex-1"
        >
          <Input
            id={`${kind}-username`}
            name="username"
            placeholder="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            minLength={3}
            maxLength={20}
            required
            aria-invalid={Boolean(state.errors?.username) || undefined}
          />
        </FormField>
        <AddButton />
      </form>
      <ActionFeedback state={state} />

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/80 bg-surface/40 px-4 py-6 text-center text-sm text-muted-foreground">
          No {kind}s yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <RemoveRow key={item.userId} item={item} kind={kind} />
          ))}
        </ul>
      )}
    </div>
  );
}
