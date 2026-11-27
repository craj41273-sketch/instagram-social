"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { updateAccountCategoryAction } from "@/app/actions/professional";
import { initialActionState, type ActionState } from "@/app/actions/settings-types";
import { ActionFeedback } from "@/components/settings/action-feedback";
import { FormField } from "@/components/shared/form-field";
import { PremiumButton } from "@/components/ui/premium-button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ACCOUNT_CATEGORIES, PROFESSIONAL_ROLES } from "@/lib/privacy/constants";

type DetailValue = string | string[];
type DetailKey =
  | "companyName"
  | "industry"
  | "skills"
  | "services"
  | "languages"
  | "frameworks"
  | "specialties"
  | "creatorNiche"
  | "marketingSpecialties"
  | "storeName"
  | "jobTitle"
  | "availability"
  | "tools";

const LIST_KEYS: readonly DetailKey[] = [
  "skills",
  "services",
  "languages",
  "frameworks",
  "specialties",
  "marketingSpecialties",
  "tools",
];

const LABELS: Record<DetailKey | "headline", string> = {
  headline: "Headline",
  companyName: "Company name",
  industry: "Industry",
  skills: "Skills",
  services: "Services",
  languages: "Languages",
  frameworks: "Frameworks",
  specialties: "Specialties",
  creatorNiche: "Creator niche",
  marketingSpecialties: "Marketing specialties",
  storeName: "Store name",
  jobTitle: "Job title",
  availability: "Availability",
  tools: "Tools",
};

/** No field claims verification; these are self-described profile details. */
const DETAILS_BY_CATEGORY: Record<string, readonly DetailKey[]> = {
  personal: ["skills", "languages"],
  developer: ["jobTitle", "companyName", "industry", "skills", "frameworks", "tools"],
  company: ["companyName", "industry", "services", "languages"],
  creator: ["creatorNiche", "tools", "languages"],
  marketer: ["marketingSpecialties", "services", "tools"],
  freelancer: ["services", "skills", "availability", "languages"],
  ecommerce: ["storeName", "industry", "services", "skills"],
  designer: ["specialties", "tools", "services", "languages"],
  photographer: ["specialties", "tools", "services"],
  educator: ["specialties", "languages", "tools"],
  founder: ["companyName", "jobTitle", "industry", "skills"],
  professional: ["jobTitle", "industry", "skills", "services", "languages"],
  organization: ["companyName", "industry", "services", "languages"],
  student: ["skills", "languages", "tools"],
  other: ["skills", "languages"],
};

function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

function asText(value: DetailValue | undefined): string {
  if (Array.isArray(value)) return value.join(", ");
  return value ?? "";
}

function parseDetail(value: string, key: DetailKey): DetailValue {
  if (!LIST_KEYS.includes(key)) return value.trim();
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 50);
}

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
          <Spinner className="size-4 text-current" label="Saving profile" />
          Saving…
        </>
      ) : (
        "Save profile"
      )}
    </PremiumButton>
  );
}

export interface ProfessionalInitialValues {
  category: string;
  roles: string[];
  details: Record<string, DetailValue>;
}

/** Category-aware self-description; all values are revalidated server-side. */
export function ProfessionalProfileForm({
  initial,
}: {
  initial: ProfessionalInitialValues;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateAccountCategoryAction,
    initialActionState(),
  );
  const [category, setCategory] = useState(initial.category);
  const [roles, setRoles] = useState<string[]>(initial.roles);
  const [headline, setHeadline] = useState(asText(initial.details.headline));
  const [details, setDetails] = useState<Record<string, DetailValue>>(initial.details);
  const detailKeys = DETAILS_BY_CATEGORY[category] ?? DETAILS_BY_CATEGORY.other ?? [];

  function toggleRole(role: string) {
    setRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : current.length < 4
          ? [...current, role]
          : current,
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="roles" value={JSON.stringify(roles)} />
      <input type="hidden" name="headline" value={headline} />
      <input
        type="hidden"
        name="details"
        value={JSON.stringify({ ...details, headline })}
      />
      <ActionFeedback state={state} />

      <FormField id="professional-category" label="Account category" error={state.errors?.category}>
        <select
          id="professional-category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {ACCOUNT_CATEGORIES.map((option) => (
            <option key={option} value={option}>
              {humanize(option)}
            </option>
          ))}
        </select>
      </FormField>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Roles (up to four)</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {PROFESSIONAL_ROLES.map((role) => {
            const checked = roles.includes(role);
            return (
              <label
                key={role}
                htmlFor={`professional-role-${role}`}
                className="flex items-center gap-2 rounded-lg border border-border/70 bg-surface/40 px-3 py-2 text-sm"
              >
                <input
                  id={`professional-role-${role}`}
                  type="checkbox"
                  checked={checked}
                  disabled={!checked && roles.length >= 4}
                  onChange={() => toggleRole(role)}
                  className="size-4 accent-primary"
                />
                {humanize(role)}
              </label>
            );
          })}
        </div>
        {state.errors?.roles ? (
          <p role="alert" className="text-xs text-destructive">
            {state.errors.roles}
          </p>
        ) : null}
      </fieldset>

      <FormField
        id="professional-headline"
        label="Headline"
        hint="A short self-description, up to 120 characters."
        error={state.errors?.headline}
      >
        <Input
          id="professional-headline"
          value={headline}
          maxLength={120}
          placeholder="What you do"
          onChange={(event) => setHeadline(event.target.value)}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        {detailKeys.map((key) => (
          <FormField
            key={key}
            id={`professional-detail-${key}`}
            label={LABELS[key]}
            hint={LIST_KEYS.includes(key) ? "Separate entries with commas." : undefined}
          >
            <Input
              id={`professional-detail-${key}`}
              value={asText(details[key])}
              maxLength={500}
              onChange={(event) =>
                setDetails((current) => ({
                  ...current,
                  [key]: parseDetail(event.target.value, key),
                }))
              }
            />
          </FormField>
        ))}
      </div>
      {state.errors?.details ? (
        <p role="alert" className="text-xs text-destructive">
          {state.errors.details}
        </p>
      ) : null}

      <div className="flex justify-end border-t border-border/60 pt-5">
        <SaveButton />
      </div>
    </form>
  );
}
