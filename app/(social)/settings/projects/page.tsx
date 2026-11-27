import { requireProfile } from "@/lib/auth/dal";
import { ProjectManager } from "@/components/settings/project-manager";
import { SettingsPage } from "@/components/settings/settings-page";
import { getProfessionalProfile } from "@/lib/professional/service";

export default async function PortfolioProjectsPage() {
  const current = await requireProfile();
  const professional = await getProfessionalProfile(current.user.id, current.user.id);

  return (
    <SettingsPage
      title="Portfolio projects"
      description="Showcase real work with statuses, featured selection, and ordering."
      currentPath="/settings/projects"
    >
      <ProjectManager projects={professional?.projects ?? []} />
    </SettingsPage>
  );
}
