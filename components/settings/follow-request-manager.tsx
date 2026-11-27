"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import {
  cancelFollowRequestAction,
  removeFollowerAction,
  respondFollowRequestAction,
} from "@/app/actions/privacy";
import { initialActionState, type ActionState } from "@/app/actions/settings-types";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { PremiumButton } from "@/components/ui/premium-button";
import { Spinner } from "@/components/ui/spinner";

type ServerAction = (state: ActionState, formData: FormData) => Promise<ActionState>;
type ButtonVariant = "gradient" | "soft" | "outline" | "ghost" | "danger";

export interface ManagedPerson {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

function SubmitButton({
  label,
  variant,
}: {
  label: string;
  variant: ButtonVariant;
}) {
  const { pending } = useFormStatus();
  return (
    <PremiumButton
      type="submit"
      premiumVariant={variant}
      size="xs"
      disabled={pending}
      aria-busy={pending || undefined}
    >
      {pending ? <Spinner className="size-3 text-current" label="Working" /> : label}
    </PremiumButton>
  );
}

function PersonActionForm({
  action,
  username,
  extras,
  label,
  variant = "outline",
}: {
  action: ServerAction;
  username: string;
  extras?: Record<string, string>;
  label: string;
  variant?: ButtonVariant;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    action,
    initialActionState(),
  );

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="username" value={username} />
      {extras
        ? Object.entries(extras).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))
        : null}
      <SubmitButton label={label} variant={variant} />
      {state.status === "error" && state.message ? (
        <span role="alert" className="text-xs text-destructive">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}

function PersonRow({
  person,
  children,
}: {
  person: ManagedPerson;
  children: ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-surface/40 p-3">
      <ProfileAvatar name={person.displayName} src={person.avatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{person.displayName}</p>
        <p className="truncate text-xs text-muted-foreground">@{person.username}</p>
      </div>
      {children}
    </li>
  );
}

function EmptyList({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border/80 bg-surface/40 px-4 py-6 text-center text-sm text-muted-foreground">
      {message}
    </p>
  );
}

/** Incoming requests, outgoing requests, and current followers in one place. */
export function FollowRequestManager({
  incoming,
  outgoing,
  followers,
}: {
  incoming: ManagedPerson[];
  outgoing: ManagedPerson[];
  followers: ManagedPerson[];
}) {
  return (
    <div className="space-y-8">
      <section aria-labelledby="incoming-requests-heading" className="space-y-3">
        <h3 id="incoming-requests-heading" className="font-heading text-base">
          Incoming requests
        </h3>
        {incoming.length === 0 ? (
          <EmptyList message="No pending requests for your account." />
        ) : (
          <ul className="space-y-2">
            {incoming.map((person) => (
              <PersonRow key={person.userId} person={person}>
                <div className="flex flex-wrap items-center gap-2">
                  <PersonActionForm
                    action={respondFollowRequestAction}
                    username={person.username}
                    extras={{ accept: "true" }}
                    label="Accept"
                    variant="soft"
                  />
                  <PersonActionForm
                    action={respondFollowRequestAction}
                    username={person.username}
                    extras={{ accept: "false" }}
                    label="Decline"
                    variant="ghost"
                  />
                </div>
              </PersonRow>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="outgoing-requests-heading" className="space-y-3">
        <h3 id="outgoing-requests-heading" className="font-heading text-base">
          Sent requests
        </h3>
        {outgoing.length === 0 ? (
          <EmptyList message="You have no pending follow requests." />
        ) : (
          <ul className="space-y-2">
            {outgoing.map((person) => (
              <PersonRow key={person.userId} person={person}>
                <PersonActionForm
                  action={cancelFollowRequestAction}
                  username={person.username}
                  label="Cancel"
                  variant="ghost"
                />
              </PersonRow>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="followers-heading" className="space-y-3">
        <h3 id="followers-heading" className="font-heading text-base">
          Your followers
        </h3>
        {followers.length === 0 ? (
          <EmptyList message="Nobody follows you yet." />
        ) : (
          <ul className="space-y-2">
            {followers.map((person) => (
              <PersonRow key={person.userId} person={person}>
                <PersonActionForm
                  action={removeFollowerAction}
                  username={person.username}
                  label="Remove"
                  variant="danger"
                />
              </PersonRow>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
