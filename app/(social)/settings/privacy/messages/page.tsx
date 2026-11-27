import { requireProfile } from "@/lib/auth/dal";
import { PrivacySettingsForm } from "@/components/settings/privacy-settings-form";
import { SettingsPage } from "@/components/settings/settings-page";
import { getPrivacySettings } from "@/lib/privacy/service";

export default async function MessagePrivacyPage() {
  const current = await requireProfile();
  const initial = await getPrivacySettings(current.user.id);

  return (
    <SettingsPage
      title="Message privacy"
      description="Choose who can start conversations and what they can see."
      currentPath="/settings/privacy/messages"
    >
      <PrivacySettingsForm scope="messages" initial={initial} />
    </SettingsPage>
  );
}
