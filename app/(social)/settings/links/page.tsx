import { requireProfile } from "@/lib/auth/dal";
import { LinkManager } from "@/components/settings/link-manager";
import { SettingsPage } from "@/components/settings/settings-page";
import { getProfessionalProfile } from "@/lib/professional/service";

export default async function ProfileLinksPage() {
  const current = await requireProfile();
  const professional = await getProfessionalProfile(current.user.id, current.user.id);

  return (
    <SettingsPage
      title="Profile links"
      description="Add only full http:// or https:// URLs. Visibility is enforced on read."
      currentPath="/settings/links"
    >
      <LinkManager links={professional?.links ?? []} />
    </SettingsPage>
  );
}
