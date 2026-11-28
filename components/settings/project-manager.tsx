"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import {
  addProjectAction,
  deleteProjectAction,
  reorderProjectsAction,
  updateProjectAction,
} from "@/lib/static/actions";
import { initialActionState, type ActionState } from "@/lib/static/actions";
import { ActionFeedback } from "@/components/settings/action-feedback";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { PremiumButton } from "@/components/ui/premium-button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { PROJECT_STATUSES } from "@/lib/privacy/constants";

type ServerAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

export interface ManagedProject {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  technologies: string[];
  skills: string[];
  liveUrl: string | null;
  repositoryUrl: string | null;
  portfolioUrl: string | null;
  status: string;
  featured: boolean;
  position: number;
}

function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

/** Visible comma input, hidden JSON array so the server parses an exact list. */
function CommaListField({
  name,
  id,
  label,
  initial,
}: {
  name: string;
  id: string;
  label: string;
  initial: string;
}) {
  const [text, setText] = useState(initial);
  const values = text
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 50);

  return (
    <FormField id={id} label={label} hint="Separate entries with commas">
      <input type="hidden" name={name} value={JSON.stringify(values)} />
      <Input
        id={id}
        value={text}
        placeholder="Next.js, PostgreSQL"
        onChange={(event) => setText(event.target.value)}
      />
    </FormField>
  );
}

function ProjectFields({ prefix, defaults }: { prefix: string; defaults?: ManagedProject }) {
  return (
    <>
      <input type="hidden" name="featured" value="false" />
      <FormField id={`${prefix}-title`} label="Title">
        <Input
          id={`${prefix}-title`}
          name="title"
          defaultValue={defaults?.title}
          maxLength={120}
          placeholder="Project name"
          required
        />
      </FormField>
      <FormField id={`${prefix}-description`} label="Description" hint="Up to 2000 characters.">
        <Textarea
          id={`${prefix}-description`}
          name="description"
          defaultValue={defaults?.description ?? ""}
          maxLength={2000}
          rows={3}
        />
      </FormField>
      <div className="grid gap-3 sm:grid-cols-2">
        <CommaListField
          name="technologies"
          id={`${prefix}-technologies`}
          label="Technologies"
          initial={defaults?.technologies.join(", ") ?? ""}
        />
        <CommaListField
          name="skills"
          id={`${prefix}-skills`}
          label="Skills"
          initial={defaults?.skills.join(", ") ?? ""}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id={`${prefix}-imageUrl`} label="Image URL" hint="Full http:// or https:// URL">
          <Input
            id={`${prefix}-imageUrl`}
            name="imageUrl"
            type="url"
            defaultValue={defaults?.imageUrl ?? ""}
          />
        </FormField>
        <FormField id={`${prefix}-liveUrl`} label="Live URL">
          <Input
            id={`${prefix}-liveUrl`}
            name="liveUrl"
            type="url"
            defaultValue={defaults?.liveUrl ?? ""}
          />
        </FormField>
        <FormField id={`${prefix}-repositoryUrl`} label="Repository URL">
          <Input
            id={`${prefix}-repositoryUrl`}
            name="repositoryUrl"
            type="url"
            defaultValue={defaults?.repositoryUrl ?? ""}
          />
        </FormField>
        <FormField id={`${prefix}-portfolioUrl`} label="Portfolio URL">
          <Input
            id={`${prefix}-portfolioUrl`}
            name="portfolioUrl"
            type="url"
            defaultValue={defaults?.portfolioUrl ?? ""}
          />
        </FormField>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id={`${prefix}-status`} label="Status">
          <select
            id={`${prefix}-status`}
            name="status"
            defaultValue={defaults?.status ?? "completed"}
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {humanize(status)}
              </option>
            ))}
          </select>
        </FormField>
        <div className="flex items-end pb-1">
          <label htmlFor={`${prefix}-featured-checkbox`} className="flex items-center gap-2 text-sm">
            <input
              id={`${prefix}-featured-checkbox`}
              name="featured"
              type="checkbox"
              value="true"
              defaultChecked={defaults?.featured ?? false}
              className="size-4 accent-primary"
            />
            Featured on profile
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
      {pending ? <Spinner className="size-4 text-current" label="Adding project" /> : "Add project"}
    </PremiumButton>
  );
}

function SaveProjectButton({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex gap-2">
      <PremiumButton type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save project"}
      </PremiumButton>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

function ProjectRow({
  project,
  index,
  ids,
  onDelete,
  onMove,
}: {
  project: ManagedProject;
  index: number;
  ids: string[];
  onDelete: (formData: FormData) => void;
  onMove: (formData: FormData) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateProjectAction,
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
          <input type="hidden" name="id" value={project.id} />
          <ProjectFields prefix={`edit-${project.id}`} defaults={project} />
          <ActionFeedback state={state} />
          <SaveProjectButton onCancel={() => setEditing(false)} />
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-surface/40 p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{project.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {project.description || humanize(project.status)}
        </p>
      </div>
      <StatusBadge tone={project.featured ? "brand" : "neutral"}>
        {project.featured ? "Featured" : humanize(project.status)}
      </StatusBadge>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label={`Move ${project.title} up`}
          disabled={index === 0}
          onClick={() => move(-1)}
        >
          <ArrowUp aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label={`Move ${project.title} down`}
          disabled={index === ids.length - 1}
          onClick={() => move(1)}
        >
          <ArrowDown aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label={`Edit ${project.title}`}
          onClick={() => setEditing(true)}
        >
          <Pencil aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label={`Delete ${project.title}`}
          onClick={() => {
            const formData = new FormData();
            formData.set("id", project.id);
            onDelete(formData);
          }}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}

/** Compact add/edit/delete/reorder manager for portfolio projects. */
export function ProjectManager({ projects }: { projects: ManagedProject[] }) {
  const [addState, addAction] = useActionState<ActionState, FormData>(
    addProjectAction,
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
      <form
        action={addAction}
        className="space-y-3 rounded-xl border border-border/70 bg-surface/40 p-4"
      >
        <h3 className="font-heading text-base">Add a project</h3>
        <ProjectFields prefix="new" />
        <ActionFeedback state={addState} />
        <AddButton />
      </form>

      {notice ? (
        <p role="status" className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-sm">
          {notice}
        </p>
      ) : null}

      <section aria-labelledby="projects-list-heading" className="space-y-3">
        <h3 id="projects-list-heading" className="font-heading text-base">
          Your projects
        </h3>
        {projects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/80 bg-surface/40 px-4 py-6 text-center text-sm text-muted-foreground">
            No projects yet. Add one above.
          </p>
        ) : (
          <ul className="space-y-2">
            {projects.map((project, index) => (
              <ProjectRow
                key={project.id}
                project={project}
                index={index}
                ids={projects.map((item) => item.id)}
                onDelete={(formData) => run(deleteProjectAction, formData)}
                onMove={(formData) => run(reorderProjectsAction, formData)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
