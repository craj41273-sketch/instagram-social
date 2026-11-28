"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updatePrivacyAction } from "@/lib/static/actions";
import {
  initialActionState,
  PRIVACY_SCOPE_FIELDS,
  type PrivacyScope,
  type ActionState,
} from "@/lib/static/actions";
import { ActionFeedback } from "@/components/settings/action-feedback";
import { FormField } from "@/components/shared/form-field";
import { PremiumButton } from "@/components/ui/premium-button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { PrivacySettingsValues } from "@/lib/validations/privacy";

interface Option {
  value: string;
  label: string;
}

const AUDIENCE_OPTIONS: Option[] = [
  { value: "everyone", label: "Everyone" },
  { value: "followers", label: "Followers" },
  { value: "followed", label: "People you follow" },
  { value: "nobody", label: "Nobody" },
];

const MESSAGE_OPTIONS: Option[] = [
  { value: "everyone", label: "Everyone" },
  { value: "followers", label: "Followers" },
  { value: "nobody", label: "Nobody" },
];

const MENTION_OPTIONS: Option[] = [
  { value: "everyone", label: "Everyone" },
  { value: "followed", label: "People you follow" },
  { value: "nobody", label: "Nobody" },
];

const STORY_AUDIENCE_OPTIONS: Option[] = [
  { value: "followers", label: "Followers" },
  { value: "close_friends", label: "Close friends" },
  { value: "custom", label: "Custom audience" },
];

function humanize(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function optionsFor(name: string): Option[] {
  switch (name) {
    case "whoCanComment":
      return AUDIENCE_OPTIONS;
    case "whoCanMessage":
    case "contactVisibility":
      return MESSAGE_OPTIONS;
    case "mentionPermission":
      return MENTION_OPTIONS;
    case "storyAudience":
      return STORY_AUDIENCE_OPTIONS;
    case "storyReplies":
    case "storyInteractions":
      return [
        { value: "everyone", label: "Everyone" },
        { value: "followers", label: "Followers" },
        { value: "nobody", label: "Nobody" },
      ];
    case "profileInfoVisibility":
      return [
        { value: "everyone", label: "Everyone" },
        { value: "followers", label: "Followers" },
      ];
    case "conversationPrivacy":
      return [
        { value: "participants", label: "Participants only" },
        { value: "followers", label: "Followers too" },
      ];
    default:
      return MESSAGE_OPTIONS;
  }
}

const LABELS: Record<string, string> = {
  isPrivate: "Private account",
  whoCanMessage: "Who can message you",
  messageRequestsEnabled: "Message requests",
  readReceipts: "Read receipts",
  activityStatus: "Activity status",
  conversationPrivacy: "Conversation access",
  whoCanComment: "Who can comment",
  commentsEnabled: "Allow comments",
  mentionPermission: "Who can mention you",
  tagApproval: "Approve tags manually",
  discoverable: "Discoverable in search",
  contactVisibility: "Contact info visibility",
  profileInfoVisibility: "Profile details visibility",
  hideLikeCounts: "Hide like counts",
  hideViewCounts: "Hide view counts",
  hiddenWords: "Hidden words",
  storyAudience: "Who can see your stories",
  storyReplies: "Who can reply to stories",
  storyInteractions: "Who can react to stories",
};

const DESCRIPTIONS: Record<string, string> = {
  isPrivate: "Only approved followers can see your posts and media.",
  messageRequestsEnabled: "People you do not follow start in message requests.",
  readReceipts: "Let people see when you read their messages.",
  activityStatus: "Show when you are active on Luma.",
  commentsEnabled: "Turn off comments across all of your posts.",
  tagApproval: "Review tags before they appear on your profile.",
  discoverable: "Allow new people to find this account in search.",
  hideLikeCounts: "Hide like counts from other people on your posts.",
  hideViewCounts: "Hide view counts from other people on your stories and posts.",
  hiddenWords: "Separate words or phrases with commas or new lines. This only filters what you see.",
  storyAudience: "Choose the default audience for new stories.",
};

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <PremiumButton
      type="submit"
      size="lg"
      disabled={pending}
      aria-busy={pending || undefined}
      className="min-w-32"
    >
      {pending ? (
        <>
          <Spinner className="size-4 text-current" label="Saving settings" />
          Saving…
        </>
      ) : (
        "Save settings"
      )}
    </PremiumButton>
  );
}

function Toggle({
  name,
  initial,
  description,
}: {
  name: string;
  initial: boolean;
  description?: string;
}) {
  const id = `privacy-${name}`;
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-surface/40 p-3">
      <label htmlFor={id} className="flex min-w-0 flex-col gap-1 text-sm font-medium">
        {LABELS[name] ?? humanize(name)}
        {description ?? DESCRIPTIONS[name] ? (
          <span id={`${id}-hint`} className="text-xs font-normal leading-relaxed text-muted-foreground">
            {description ?? DESCRIPTIONS[name]}
          </span>
        ) : null}
      </label>
      <input
        id={id}
        name={name}
        type="checkbox"
        value="true"
        defaultChecked={initial}
        aria-describedby={description || DESCRIPTIONS[name] ? `${id}-hint` : undefined}
        className="mt-0.5 size-4 shrink-0 accent-primary"
      />
      <input type="hidden" name={name} value="false" aria-hidden="true" tabIndex={-1} />
    </div>
  );
}

function SelectControl({
  name,
  initial,
}: {
  name: string;
  initial: string;
}) {
  const id = `privacy-${name}`;
  return (
    <FormField id={id} label={LABELS[name] ?? humanize(name)} hint={DESCRIPTIONS[name]}>
      <select
        id={id}
        name={name}
        defaultValue={initial}
        className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {optionsFor(name).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}

interface PrivacySettingsFormProps {
  scope: PrivacyScope;
  initial: PrivacySettingsValues;
  className?: string;
}

/** Owner-only settings form; each route shows only its own scoped controls. */
export function PrivacySettingsForm({
  scope,
  initial,
  className,
}: PrivacySettingsFormProps) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    updatePrivacyAction,
    initialActionState(),
  );
  const visible = new Set<string>(PRIVACY_SCOPE_FIELDS[scope]);

  return (
    <form action={formAction} className={cn("space-y-5", className)}>
      <input type="hidden" name="scope" value={scope} />
      <ActionFeedback state={state} />

      {visible.has("isPrivate") ? <Toggle name="isPrivate" initial={initial.isPrivate} /> : null}
      {visible.has("discoverable") ? (
        <Toggle name="discoverable" initial={initial.discoverable} />
      ) : null}
      {visible.has("activityStatus") ? (
        <Toggle name="activityStatus" initial={initial.activityStatus} />
      ) : null}
      {visible.has("contactVisibility") ? (
        <SelectControl name="contactVisibility" initial={initial.contactVisibility} />
      ) : null}
      {visible.has("profileInfoVisibility") ? (
        <SelectControl name="profileInfoVisibility" initial={initial.profileInfoVisibility} />
      ) : null}
      {visible.has("hideLikeCounts") ? (
        <Toggle name="hideLikeCounts" initial={initial.hideLikeCounts} />
      ) : null}
      {visible.has("hideViewCounts") ? (
        <Toggle name="hideViewCounts" initial={initial.hideViewCounts} />
      ) : null}

      {visible.has("storyAudience") ? (
        <SelectControl name="storyAudience" initial={initial.storyAudience} />
      ) : null}
      {visible.has("storyReplies") ? (
        <SelectControl name="storyReplies" initial={initial.storyReplies} />
      ) : null}
      {visible.has("storyInteractions") ? (
        <SelectControl name="storyInteractions" initial={initial.storyInteractions} />
      ) : null}

      {visible.has("whoCanMessage") ? (
        <SelectControl name="whoCanMessage" initial={initial.whoCanMessage} />
      ) : null}
      {visible.has("messageRequestsEnabled") ? (
        <Toggle name="messageRequestsEnabled" initial={initial.messageRequestsEnabled} />
      ) : null}
      {visible.has("readReceipts") ? (
        <Toggle name="readReceipts" initial={initial.readReceipts} />
      ) : null}
      {visible.has("conversationPrivacy") ? (
        <SelectControl name="conversationPrivacy" initial={initial.conversationPrivacy} />
      ) : null}

      {visible.has("commentsEnabled") ? (
        <Toggle name="commentsEnabled" initial={initial.commentsEnabled} />
      ) : null}
      {visible.has("whoCanComment") ? (
        <SelectControl name="whoCanComment" initial={initial.whoCanComment} />
      ) : null}

      {visible.has("mentionPermission") ? (
        <SelectControl name="mentionPermission" initial={initial.mentionPermission} />
      ) : null}
      {visible.has("tagApproval") ? (
        <Toggle name="tagApproval" initial={initial.tagApproval} />
      ) : null}

      {visible.has("hiddenWords") ? (
        <FormField
          id="privacy-hiddenWords"
          label="Hidden words and phrases"
          error={state.errors?.hiddenWords}
          hint={DESCRIPTIONS.hiddenWords}
        >
          <Textarea
            id="privacy-hiddenWords"
            name="hiddenWords"
            defaultValue={initial.hiddenWords.join("\n")}
            rows={5}
            maxLength={6000}
            placeholder="word, phrase"
            aria-invalid={Boolean(state.errors?.hiddenWords) || undefined}
          />
        </FormField>
      ) : null}

      <div className="flex justify-end border-t border-border/60 pt-5">
        <SaveButton />
      </div>
    </form>
  );
}
