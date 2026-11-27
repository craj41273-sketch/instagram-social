import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  portfolioProjects,
  profileLinks,
  profiles,
  users,
} from "@/lib/db/schema";
import { parseUserId } from "@/lib/db/profile-sql";
import { canViewAccount, getPrivacyContext } from "@/lib/privacy/service";
import { AuthorizationError, ValidationError } from "@/lib/errors";
import type { AccountCategoryValues } from "@/lib/validations/privacy";
import type {
  PortfolioProjectInput,
  ProfileLinkInput,
} from "@/lib/validations/professional";

export interface ProfessionalProfile {
  userId: string;
  category: string;
  roles: string[];
  details: Record<string, string | string[]>;
  links: Array<{
    id: string;
    label: string;
    url: string;
    linkType: string;
    icon: string | null;
    position: number;
    enabled: boolean;
    visibility: string;
  }>;
  projects: Array<{
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
    position: number;
    featured: boolean;
  }>;
}

function nullable(value: string | undefined): string | null {
  return value && value.trim().length > 0 ? value : null;
}

async function nextPosition(userId: string, table: "links" | "projects") {
  const column = table === "links" ? profileLinks.position : portfolioProjects.position;
  const source = table === "links" ? profileLinks : portfolioProjects;
  const rows = await getDb()
    .select({ position: column })
    .from(source)
    .where(eq(source.userId, userId))
    .orderBy(asc(column));
  return Math.max(-1, ...rows.map((row) => row.position)) + 1;
}

/** Public-safe professional projection; contact fields obey privacy controls. */
export async function getProfessionalProfile(
  targetUserId: string,
  viewerId: string | null = null,
): Promise<ProfessionalProfile | null> {
  if (!parseUserId(targetUserId)) return null;

  const context = await getPrivacyContext(viewerId, targetUserId);
  if (!canViewAccount(context)) return null;

  const rows = await getDb()
    .select({
      userId: users.id,
      category: profiles.accountCategory,
      roles: profiles.professionalRoles,
      details: profiles.professionalDetails,
    })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.id, targetUserId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const isOwner = viewerId === targetUserId;
  const contactAllowed =
    isOwner || context.settings.contactVisibility === "everyone" ||
    (context.settings.contactVisibility === "followers" && context.viewerFollowsTarget);
  const details = { ...(row.details ?? {}) };
  if (!contactAllowed) {
    for (const key of ["contactEmail", "businessEmail", "contactLink", "creatorContact"]) {
      delete details[key];
    }
  }

  const [linkRows, projectRows] = await Promise.all([
    getDb()
      .select()
      .from(profileLinks)
      .where(eq(profileLinks.userId, targetUserId))
      .orderBy(asc(profileLinks.position), asc(profileLinks.id)),
    getDb()
      .select()
      .from(portfolioProjects)
      .where(eq(portfolioProjects.userId, targetUserId))
      .orderBy(asc(portfolioProjects.position), asc(portfolioProjects.id)),
  ]);

  return {
    userId: row.userId,
    category: row.category,
    roles: row.roles ?? [],
    details,
    links: linkRows
      .filter((link) => isOwner || link.enabled)
      .filter(
        (link) =>
          isOwner ||
          link.visibility === "everyone" ||
          (link.visibility === "followers" && context.viewerFollowsTarget),
      )
      .map((link) => ({
        id: link.id,
        label: link.label,
        url: link.url,
        linkType: link.linkType,
        icon: link.icon,
        position: link.position,
        enabled: link.enabled,
        visibility: link.visibility,
      })),
    projects: projectRows.map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description,
      imageUrl: nullable(project.imageUrl ?? undefined),
      technologies: project.technologies ?? [],
      skills: project.skills ?? [],
      liveUrl: nullable(project.liveUrl ?? undefined),
      repositoryUrl: nullable(project.repositoryUrl ?? undefined),
      portfolioUrl: nullable(project.portfolioUrl ?? undefined),
      status: project.status,
      position: project.position,
      featured: project.featured,
    })),
  };
}

/** Category changes never touch posts, follows, messages, or auth records. */
export async function updateOwnAccountCategory(
  userId: string,
  input: AccountCategoryValues,
): Promise<void> {
  if (!parseUserId(userId)) throw new ValidationError("Invalid account identity.");
  await getDb()
    .update(profiles)
    .set({
      accountCategory: input.category,
      professionalRoles: input.roles,
      professionalDetails: input.details as Record<string, string | string[]>,
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, userId));
}

export async function addProfileLink(
  userId: string,
  input: ProfileLinkInput,
): Promise<{ id: string }> {
  if (!parseUserId(userId)) throw new ValidationError("Invalid account identity.");
  const position = await nextPosition(userId, "links");
  const rows = await getDb()
    .insert(profileLinks)
    .values({
      userId,
      label: input.label,
      url: input.url,
      linkType: input.linkType,
      icon: nullable(input.icon),
      enabled: input.enabled,
      visibility: input.visibility,
      position,
    })
    .returning({ id: profileLinks.id });
  const created = rows[0];
  if (!created) throw new Error("Could not create link.");
  return created;
}

export async function updateOwnProfileLink(
  userId: string,
  linkId: string,
  input: ProfileLinkInput,
): Promise<void> {
  if (!parseUserId(userId) || !parseUserId(linkId)) {
    throw new ValidationError("Invalid link identity.");
  }
  const result = await getDb()
    .update(profileLinks)
    .set({
      label: input.label,
      url: input.url,
      linkType: input.linkType,
      icon: nullable(input.icon),
      enabled: input.enabled,
      visibility: input.visibility,
      updatedAt: new Date(),
    })
    .where(and(eq(profileLinks.id, linkId), eq(profileLinks.userId, userId)))
    .returning({ id: profileLinks.id });
  if (result.length === 0) throw new AuthorizationError();
}

export async function deleteOwnProfileLink(
  userId: string,
  linkId: string,
): Promise<void> {
  if (!parseUserId(userId) || !parseUserId(linkId)) {
    throw new ValidationError("Invalid link identity.");
  }
  await getDb()
    .delete(profileLinks)
    .where(and(eq(profileLinks.id, linkId), eq(profileLinks.userId, userId)));
}

export async function reorderProfileLinks(
  userId: string,
  ids: string[],
): Promise<void> {
  if (!parseUserId(userId) || ids.some((id) => !parseUserId(id))) {
    throw new ValidationError("Invalid link identity.");
  }
  const owned = await getDb()
    .select({ id: profileLinks.id })
    .from(profileLinks)
    .where(eq(profileLinks.userId, userId));
  const ownedIds = new Set(owned.map((row) => row.id));
  if (!ids.every((id) => ownedIds.has(id))) throw new AuthorizationError();

  for (const [position, id] of ids.entries()) {
    await getDb()
      .update(profileLinks)
      .set({ position, updatedAt: new Date() })
      .where(and(eq(profileLinks.id, id), eq(profileLinks.userId, userId)));
  }
}

export async function addPortfolioProject(
  userId: string,
  input: PortfolioProjectInput,
): Promise<{ id: string }> {
  if (!parseUserId(userId)) throw new ValidationError("Invalid account identity.");
  const position = await nextPosition(userId, "projects");
  const rows = await getDb()
    .insert(portfolioProjects)
    .values({
      userId,
      title: input.title,
      description: input.description,
      imageUrl: nullable(input.imageUrl),
      technologies: input.technologies,
      skills: input.skills,
      liveUrl: nullable(input.liveUrl),
      repositoryUrl: nullable(input.repositoryUrl),
      portfolioUrl: nullable(input.portfolioUrl),
      status: input.status,
      featured: input.featured,
      position,
    })
    .returning({ id: portfolioProjects.id });
  const created = rows[0];
  if (!created) throw new Error("Could not create project.");
  return created;
}

export async function updateOwnPortfolioProject(
  userId: string,
  projectId: string,
  input: PortfolioProjectInput,
): Promise<void> {
  if (!parseUserId(userId) || !parseUserId(projectId)) {
    throw new ValidationError("Invalid project identity.");
  }
  const rows = await getDb()
    .update(portfolioProjects)
    .set({
      title: input.title,
      description: input.description,
      imageUrl: nullable(input.imageUrl),
      technologies: input.technologies,
      skills: input.skills,
      liveUrl: nullable(input.liveUrl),
      repositoryUrl: nullable(input.repositoryUrl),
      portfolioUrl: nullable(input.portfolioUrl),
      status: input.status,
      featured: input.featured,
      updatedAt: new Date(),
    })
    .where(and(eq(portfolioProjects.id, projectId), eq(portfolioProjects.userId, userId)))
    .returning({ id: portfolioProjects.id });
  if (rows.length === 0) throw new AuthorizationError();
}

export async function deleteOwnPortfolioProject(
  userId: string,
  projectId: string,
): Promise<void> {
  if (!parseUserId(userId) || !parseUserId(projectId)) {
    throw new ValidationError("Invalid project identity.");
  }
  await getDb()
    .delete(portfolioProjects)
    .where(and(eq(portfolioProjects.id, projectId), eq(portfolioProjects.userId, userId)));
}

export async function reorderPortfolioProjects(
  userId: string,
  ids: string[],
): Promise<void> {
  if (!parseUserId(userId) || ids.some((id) => !parseUserId(id))) {
    throw new ValidationError("Invalid project identity.");
  }
  const owned = await getDb()
    .select({ id: portfolioProjects.id })
    .from(portfolioProjects)
    .where(eq(portfolioProjects.userId, userId));
  const ownedIds = new Set(owned.map((row) => row.id));
  if (!ids.every((id) => ownedIds.has(id))) throw new AuthorizationError();

  for (const [position, id] of ids.entries()) {
    await getDb()
      .update(portfolioProjects)
      .set({ position, updatedAt: new Date() })
      .where(and(eq(portfolioProjects.id, id), eq(portfolioProjects.userId, userId)));
  }
}

/** Counts used by admin diagnostics; no fabricated totals. */
export async function getProfessionalCounts(userId: string) {
  const result = await getDb()
    .execute<{ links: number | string; projects: number | string }>(sql`
      SELECT
        (SELECT count(*)::int FROM ${profileLinks} WHERE user_id = ${userId}) AS links,
        (SELECT count(*)::int FROM ${portfolioProjects} WHERE user_id = ${userId}) AS projects
    `);
  const row = Array.isArray(result)
    ? result[0]
    : ((result as { rows?: Array<Record<string, number | string>> }).rows?.[0] ?? undefined);
  return {
    links: Number(row?.links ?? 0),
    projects: Number(row?.projects ?? 0),
  };
}
