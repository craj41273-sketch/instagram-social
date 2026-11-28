"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { updateProfileAction } from "@/lib/static/actions";
import { FormField } from "@/components/shared/form-field";
import { PremiumButton } from "@/components/ui/premium-button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  initialProfileActionState,
  type ProfileActionState,
} from "@/lib/profile/action-state";

export interface EditProfileInitialValues {
  displayName: string;
  username: string;
  bio: string;
  website: string;
  location: string;
}

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <PremiumButton
      type="submit"
      premiumVariant="gradient"
      size="lg"
      disabled={pending}
      aria-busy={pending || undefined}
      className="min-w-32"
    >
      {pending ? (
        <>
          <Spinner className="size-4 text-current" label="Saving profile" />
          Saving…
        </>
      ) : (
        "Save changes"
      )}
    </PremiumButton>
  );
}

/** Owner-only edit form; every field is revalidated on the server. */
export function EditProfileForm({
  initial,
}: {
  initial: EditProfileInitialValues;
}) {
  const [state, formAction] = useActionState<ProfileActionState, FormData>(
    updateProfileAction,
    initialProfileActionState(),
  );
  const cancelHref = `/profile/${state.username ?? initial.username}`;

  return (
    <form action={formAction} className="space-y-6">
      {state.status === "success" && state.message ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success"
        >
          <CircleCheck className="size-4" aria-hidden="true" />
          {state.message}
        </div>
      ) : null}

      {state.status === "error" && state.message ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="displayName"
          label="Display name"
          error={state.errors?.displayName}
          hint="2–50 characters"
        >
          <Input
            id="displayName"
            name="displayName"
            defaultValue={initial.displayName}
            maxLength={50}
            required
            aria-invalid={Boolean(state.errors?.displayName) || undefined}
          />
        </FormField>

        <FormField
          id="username"
          label="Username"
          error={state.errors?.username}
          hint="Lowercase letters, numbers, dots, and underscores"
        >
          <Input
            id="username"
            name="username"
            defaultValue={initial.username}
            maxLength={20}
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={Boolean(state.errors?.username) || undefined}
          />
        </FormField>
      </div>

      <FormField
        id="bio"
        label="Bio"
        error={state.errors?.bio}
        hint="Up to 160 characters"
      >
        <Textarea
          id="bio"
          name="bio"
          defaultValue={initial.bio}
          maxLength={160}
          rows={4}
          placeholder="Tell people what you're about…"
          aria-invalid={Boolean(state.errors?.bio) || undefined}
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="website"
          label="Website"
          error={state.errors?.website}
          hint="Full http:// or https:// URL"
        >
          <Input
            id="website"
            name="website"
            type="url"
            defaultValue={initial.website}
            maxLength={200}
            placeholder="https://example.com"
            aria-invalid={Boolean(state.errors?.website) || undefined}
          />
        </FormField>

        <FormField
          id="location"
          label="Location"
          error={state.errors?.location}
          hint="Up to 100 characters"
        >
          <Input
            id="location"
            name="location"
            defaultValue={initial.location}
            maxLength={100}
            placeholder="City, Country"
            aria-invalid={Boolean(state.errors?.location) || undefined}
          />
        </FormField>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-border/60 pt-5 sm:flex-row sm:justify-end">
        <PremiumButton premiumVariant="ghost" size="lg" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </PremiumButton>
        <SaveButton />
      </div>
    </form>
  );
}
