"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveProfile } from "@/lib/auth/dal";
import { toSafeMessage } from "@/lib/errors";
import { logServerError } from "@/lib/logging";
import {
  addPortfolioProject,
  addProfileLink,
  deleteOwnPortfolioProject,
  deleteOwnProfileLink,
  reorderPortfolioProjects,
  reorderProfileLinks,
  updateOwnAccountCategory,
  updateOwnPortfolioProject,
  updateOwnProfileLink,
} from "@/lib/professional/service";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { toFormErrors } from "@/lib/validations/auth";
import { accountCategorySchema } from "@/lib/validations/privacy";
import {
  linkOrderSchema,
  portfolioProjectSchema,
  profileLinkInputSchema,
} from "@/lib/validations/professional";
import type { ActionState } from "@/app/actions/settings-types";

const RATE_LIMIT_MESSAGE =
  "Too many professional changes. Please wait a moment before trying again.";

const idSchema = z.uuid();

function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formBool(formData: FormData, key: string): boolean {
  return formData.getAll(key).includes("true");
}

function jsonField(formData: FormData, key: string): unknown {
  const raw = formText(formData, key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

async function sessionIdentity(): Promise<{ id: string; username: string } | null> {
  const current = await getActiveProfile();
  if (!current) return null;
  return { id: current.user.id, username: current.user.username };
}

function rateLimited(userId: string, action: string): boolean {
  return !consumeRateLimit(`professional:${action}:${userId}`, 20, 10 * 60_000).allowed;
}

function fail(scope: string, error: unknown): ActionState {
  logServerError(scope, error);
  return { status: "error", message: toSafeMessage(error) };
}

function revalidateProfessionalPaths(username: string, section: string): void {
  revalidatePath("/settings");
  revalidatePath(`/settings/${section}`);
  revalidatePath("/profile/[username]", "page");
  revalidatePath(`/profile/${username}`);
}

function linkInput(formData: FormData) {
  return {
    label: formText(formData, "label"),
    url: formText(formData, "url"),
    linkType: formText(formData, "linkType"),
    icon: formText(formData, "icon"),
    enabled: formBool(formData, "enabled"),
    visibility: formText(formData, "visibility"),
  };
}

function projectInput(formData: FormData) {
  return {
    title: formText(formData, "title"),
    description: formText(formData, "description"),
    imageUrl: formText(formData, "imageUrl"),
    technologies: jsonField(formData, "technologies"),
    skills: jsonField(formData, "skills"),
    liveUrl: formText(formData, "liveUrl"),
    repositoryUrl: formText(formData, "repositoryUrl"),
    portfolioUrl: formText(formData, "portfolioUrl"),
    status: formText(formData, "status"),
    featured: formBool(formData, "featured"),
  };
}

/** Category, roles, headline, and category-aware details are owner-only. */
export async function updateAccountCategoryAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = accountCategorySchema.safeParse({
    category: formText(formData, "category"),
    roles: jsonField(formData, "roles"),
    headline: formText(formData, "headline"),
    details: jsonField(formData, "details"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      errors: toFormErrors(parsed.error),
    };
  }

  let identity;
  try {
    identity = await sessionIdentity();
    if (!identity) return { status: "error", message: "Sign in to edit your profile." };
  } catch (error) {
    return fail("professional.categoryIdentity", error);
  }
  if (rateLimited(identity.id, "category")) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  const headline = parsed.data.headline;
  const details = { ...parsed.data.details };
  if (headline) details.headline = headline;
  else delete details.headline;

  try {
    await updateOwnAccountCategory(identity.id, { ...parsed.data, details });
  } catch (error) {
    return fail("professional.category", error);
  }

  revalidateProfessionalPaths(identity.username, "professional");
  return { status: "success", message: "Your professional profile has been saved." };
}

export async function addLinkAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = profileLinkInputSchema.safeParse(linkInput(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the link details.",
      errors: toFormErrors(parsed.error),
    };
  }

  let identity;
  try {
    identity = await sessionIdentity();
    if (!identity) return { status: "error", message: "Sign in to manage links." };
  } catch (error) {
    return fail("professional.linkIdentity", error);
  }
  if (rateLimited(identity.id, "links")) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  try {
    await addProfileLink(identity.id, parsed.data);
  } catch (error) {
    return fail("professional.addLink", error);
  }

  revalidateProfessionalPaths(identity.username, "links");
  return { status: "success", message: "Link added." };
}

export async function updateLinkAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsedId = idSchema.safeParse(formText(formData, "id"));
  const parsed = profileLinkInputSchema.safeParse(linkInput(formData));
  if (!parsedId.success || !parsed.success) {
    return {
      status: "error",
      message: "Please check the link details.",
      errors: !parsed.success ? toFormErrors(parsed.error) : undefined,
    };
  }

  let identity;
  try {
    identity = await sessionIdentity();
    if (!identity) return { status: "error", message: "Sign in to manage links." };
  } catch (error) {
    return fail("professional.linkIdentity", error);
  }
  if (rateLimited(identity.id, "links")) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  try {
    await updateOwnProfileLink(identity.id, parsedId.data, parsed.data);
  } catch (error) {
    return fail("professional.updateLink", error);
  }

  revalidateProfessionalPaths(identity.username, "links");
  return { status: "success", message: "Link updated." };
}

export async function deleteLinkAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsedId = idSchema.safeParse(formText(formData, "id"));
  if (!parsedId.success) return { status: "error", message: "That link is not available." };

  let identity;
  try {
    identity = await sessionIdentity();
    if (!identity) return { status: "error", message: "Sign in to manage links." };
  } catch (error) {
    return fail("professional.linkIdentity", error);
  }
  if (rateLimited(identity.id, "links")) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  try {
    await deleteOwnProfileLink(identity.id, parsedId.data);
  } catch (error) {
    return fail("professional.deleteLink", error);
  }

  revalidateProfessionalPaths(identity.username, "links");
  return { status: "success", message: "Link removed." };
}

export async function reorderLinksAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = linkOrderSchema.safeParse({ ids: jsonField(formData, "ids") });
  if (!parsed.success) return { status: "error", message: "Could not reorder links." };

  let identity;
  try {
    identity = await sessionIdentity();
    if (!identity) return { status: "error", message: "Sign in to manage links." };
  } catch (error) {
    return fail("professional.linkIdentity", error);
  }
  if (rateLimited(identity.id, "links")) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  try {
    await reorderProfileLinks(identity.id, parsed.data.ids);
  } catch (error) {
    return fail("professional.reorderLinks", error);
  }

  revalidateProfessionalPaths(identity.username, "links");
  return { status: "success", message: "Link order saved." };
}

export async function addProjectAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = portfolioProjectSchema.safeParse(projectInput(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the project details.",
      errors: toFormErrors(parsed.error),
    };
  }

  let identity;
  try {
    identity = await sessionIdentity();
    if (!identity) return { status: "error", message: "Sign in to manage projects." };
  } catch (error) {
    return fail("professional.projectIdentity", error);
  }
  if (rateLimited(identity.id, "projects")) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  try {
    await addPortfolioProject(identity.id, parsed.data);
  } catch (error) {
    return fail("professional.addProject", error);
  }

  revalidateProfessionalPaths(identity.username, "projects");
  return { status: "success", message: "Project added." };
}

export async function updateProjectAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsedId = idSchema.safeParse(formText(formData, "id"));
  const parsed = portfolioProjectSchema.safeParse(projectInput(formData));
  if (!parsedId.success || !parsed.success) {
    return {
      status: "error",
      message: "Please check the project details.",
      errors: !parsed.success ? toFormErrors(parsed.error) : undefined,
    };
  }

  let identity;
  try {
    identity = await sessionIdentity();
    if (!identity) return { status: "error", message: "Sign in to manage projects." };
  } catch (error) {
    return fail("professional.projectIdentity", error);
  }
  if (rateLimited(identity.id, "projects")) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  try {
    await updateOwnPortfolioProject(identity.id, parsedId.data, parsed.data);
  } catch (error) {
    return fail("professional.updateProject", error);
  }

  revalidateProfessionalPaths(identity.username, "projects");
  return { status: "success", message: "Project updated." };
}

export async function deleteProjectAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsedId = idSchema.safeParse(formText(formData, "id"));
  if (!parsedId.success) {
    return { status: "error", message: "That project is not available." };
  }

  let identity;
  try {
    identity = await sessionIdentity();
    if (!identity) return { status: "error", message: "Sign in to manage projects." };
  } catch (error) {
    return fail("professional.projectIdentity", error);
  }
  if (rateLimited(identity.id, "projects")) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  try {
    await deleteOwnPortfolioProject(identity.id, parsedId.data);
  } catch (error) {
    return fail("professional.deleteProject", error);
  }

  revalidateProfessionalPaths(identity.username, "projects");
  return { status: "success", message: "Project removed." };
}

export async function reorderProjectsAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = linkOrderSchema.safeParse({ ids: jsonField(formData, "ids") });
  if (!parsed.success) return { status: "error", message: "Could not reorder projects." };

  let identity;
  try {
    identity = await sessionIdentity();
    if (!identity) return { status: "error", message: "Sign in to manage projects." };
  } catch (error) {
    return fail("professional.projectIdentity", error);
  }
  if (rateLimited(identity.id, "projects")) {
    return { status: "error", message: RATE_LIMIT_MESSAGE };
  }

  try {
    await reorderPortfolioProjects(identity.id, parsed.data.ids);
  } catch (error) {
    return fail("professional.reorderProjects", error);
  }

  revalidateProfessionalPaths(identity.username, "projects");
  return { status: "success", message: "Project order saved." };
}
