import { requireProfile } from "@/lib/auth/dal";
import { PrivacySettingsForm } from "@/components/settings/privacy-settings-form";
import { SettingsPage } from "@/components/settings/settings-page";
import { getPrivacySettings } from "@/lib/privacy/service";

export default async function NotificationSettingsPage() {
  const current = await requireProfile();
  const initial = await getPrivacySettings(current.user.id);

  return (
    <SettingsPage
      title="Notification controls"
      description="Activity status and message requests affect what others can send you."
      currentPath="/settings/notifications"
    >
      <PrivacySettingsForm scope="notifications" initial={initial} />
    </SettingsPage>
  );
}
