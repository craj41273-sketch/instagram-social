import { requireProfile } from "@/lib/auth/dal";
import { PrivacySettingsForm } from "@/components/settings/privacy-settings-form";
import { SettingsPage } from "@/components/settings/settings-page";
import { getPrivacySettings } from "@/lib/privacy/service";

export default async function TagsAndMentionsPage() {
  const current = await requireProfile();
  const initial = await getPrivacySettings(current.user.id);

  return (
    <SettingsPage
      title="Tags and mentions"
      description="Decide who can mention you and whether tags need approval."
      currentPath="/settings/privacy/tags-and-mentions"
    >
      <PrivacySettingsForm scope="mentions" initial={initial} />
    </SettingsPage>
  );
}
