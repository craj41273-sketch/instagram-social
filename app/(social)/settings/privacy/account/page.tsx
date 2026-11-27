import { requireProfile } from "@/lib/auth/dal";
import { PrivacySettingsForm } from "@/components/settings/privacy-settings-form";
import { SettingsPage } from "@/components/settings/settings-page";
import { getPrivacySettings } from "@/lib/privacy/service";

export default async function AccountPrivacyPage() {
  const current = await requireProfile();
  const initial = await getPrivacySettings(current.user.id);

  return (
    <SettingsPage
      title="Account privacy"
      description="Control who can find this account and see its details."
      currentPath="/settings/privacy/account"
    >
      <PrivacySettingsForm scope="account" initial={initial} />
    </SettingsPage>
  );
}
