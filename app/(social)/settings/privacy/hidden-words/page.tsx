import { requireProfile } from "@/lib/auth/dal";
import { PrivacySettingsForm } from "@/components/settings/privacy-settings-form";
import { SettingsPage } from "@/components/settings/settings-page";
import { getPrivacySettings } from "@/lib/privacy/service";

export default async function HiddenWordsPage() {
  const current = await requireProfile();
  const initial = await getPrivacySettings(current.user.id);

  return (
    <SettingsPage
      title="Hidden words"
      description="Filter words and phrases from the content you see."
      currentPath="/settings/privacy/hidden-words"
    >
      <PrivacySettingsForm scope="hiddenWords" initial={initial} />
    </SettingsPage>
  );
}
