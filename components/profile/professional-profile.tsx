import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { logServerError } from "@/lib/logging";
import { getProfessionalProfile } from "@/lib/professional/service";
import { safeHttpUrl } from "@/lib/profile/format";

function humanize(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function detailText(value: string | string[]): string {
  return Array.isArray(value) ? value.join(", ") : value;
}

function ExternalHref({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="inline-flex items-center gap-1 rounded-sm text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-ring"
    >
      {children}
      <ExternalLink className="size-3" aria-hidden="true" />
    </a>
  );
}

/** Self-described professional data; the service already applies privacy filters. */
export async function ProfessionalProfile({
  targetId,
  viewerId,
}: {
  targetId: string;
  viewerId: string | null;
}) {
  let data;
  try {
    data = await getProfessionalProfile(targetId, viewerId);
  } catch (error) {
    logServerError("professional.profile", error, { userId: targetId });
    return null;
  }
  if (!data) return null;

  const details = Object.entries(data.details)
    .filter(([, value]) => detailText(value).trim().length > 0)
    .slice(0, 12);
  const links = data.links
    .map((link) => ({ ...link, href: safeHttpUrl(link.url) }))
    .filter((link) => link.href !== null);
  const featured = data.projects.filter((project) => project.featured);

  if (
    data.category === "personal" &&
    data.roles.length === 0 &&
    details.length === 0 &&
    links.length === 0 &&
    featured.length === 0
  ) {
    return null;
  }

  return (
    <section
      aria-labelledby="professional-profile-heading"
      className="rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="professional-profile-heading" className="font-heading text-lg tracking-tight">
          Professional profile
        </h2>
        <StatusBadge tone="brand">{humanize(data.category)}</StatusBadge>
      </div>

      {data.roles.length > 0 ? (
        <ul aria-label="Roles" className="mt-3 flex flex-wrap gap-2">
          {data.roles.map((role) => (
            <li key={role}>
              <StatusBadge tone="neutral">{humanize(role)}</StatusBadge>
            </li>
          ))}
        </ul>
      ) : null}

      {details.length > 0 ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {details.map(([key, value]) => (
            <div key={key} className="min-w-0 rounded-xl border border-border/60 bg-surface/40 p-3">
              <dt className="text-xs text-muted-foreground">{humanize(key)}</dt>
              <dd className="mt-1 break-words text-sm">{detailText(value)}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {links.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          {links.map((link) => (
            <li key={link.id} className="text-sm">
              <ExternalHref href={link.href ?? ""}>{link.label}</ExternalHref>
            </li>
          ))}
        </ul>
      ) : null}

      {featured.length > 0 ? (
        <div className="mt-5 space-y-3">
          <h3 className="font-heading text-base">Featured projects</h3>
          <ul className="grid gap-3 sm:grid-cols-2">
            {featured.map((project) => {
              const urls = [
                { label: "Live site", value: safeHttpUrl(project.liveUrl) },
                { label: "Source", value: safeHttpUrl(project.repositoryUrl) },
                { label: "Portfolio", value: safeHttpUrl(project.portfolioUrl) },
              ].filter((item) => item.value !== null);
              return (
                <li
                  key={project.id}
                  className="rounded-xl border border-border/70 bg-surface/40 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{project.title}</p>
                    <StatusBadge tone="neutral">{humanize(project.status)}</StatusBadge>
                  </div>
                  {project.description ? (
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {project.description}
                    </p>
                  ) : null}
                  {project.technologies.length > 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {project.technologies.join(", ")}
                    </p>
                  ) : null}
                  {urls.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      {urls.map((item) => (
                        <li key={item.label}>
                          <ExternalHref href={item.value ?? ""}>{item.label}</ExternalHref>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <p className="mt-4 text-xs text-muted-foreground">
        Details on this profile are self-described and shown according to this account&apos;s
        privacy settings.
      </p>
    </section>
  );
}
