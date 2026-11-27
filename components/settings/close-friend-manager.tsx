"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { setCloseFriendAction } from "@/app/actions/privacy";
import { initialActionState, type ActionState } from "@/app/actions/settings-types";
import { ActionFeedback } from "@/components/settings/action-feedback";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { FormField } from "@/components/shared/form-field";
import { PremiumButton } from "@/components/ui/premium-button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export interface CloseFriendPerson {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <PremiumButton type="submit" size="sm" disabled={pending} aria-busy={pending || undefined}>
      {pending ? <Spinner className="size-4 text-current" label="Adding" /> : "Add"}
    </PremiumButton>
  );
}

function RemoveButton() {
  const { pending } = useFormStatus();
  return (
    <PremiumButton type="submit" premiumVariant="danger" size="xs" disabled={pending}>
      {pending ? "Removing…" : "Remove"}
    </PremiumButton>
  );
}

function RemoveRow({ person }: { person: CloseFriendPerson }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    setCloseFriendAction,
    initialActionState(),
  );

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-surface/40 p-3">
      <ProfileAvatar name={person.displayName} src={person.avatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{person.displayName}</p>
        <p className="truncate text-xs text-muted-foreground">@{person.username}</p>
      </div>
      <form action={formAction} className="flex flex-col items-end gap-1">
        <input type="hidden" name="username" value={person.username} />
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

/** Close friends are story-only members; no other social edge is changed. */
export function CloseFriendManager({ items }: { items: CloseFriendPerson[] }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    setCloseFriendAction,
    initialActionState(),
  );

  return (
    <section aria-labelledby="close-friends-heading" className="mt-8 space-y-3 border-t border-border/60 pt-6">
      <div>
        <h3 id="close-friends-heading" className="font-heading text-base">
          Close friends
        </h3>
        <p className="text-xs text-muted-foreground">
          Choose close friends as the default story audience. Custom per-story audiences
          are not managed here.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <input type="hidden" name="intent" value="add" />
        <FormField
          id="close-friend-username"
          label="Add a close friend"
          hint="Enter an exact Luma username."
          error={state.errors?.username}
          className="flex-1"
        >
          <Input
            id="close-friend-username"
            name="username"
            placeholder="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            minLength={3}
            maxLength={20}
            required
          />
        </FormField>
        <AddButton />
      </form>
      <ActionFeedback state={state} />

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/80 bg-surface/40 px-4 py-6 text-center text-sm text-muted-foreground">
          No close friends yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((person) => (
            <RemoveRow key={person.userId} person={person} />
          ))}
        </ul>
      )}
    </section>
  );
}
