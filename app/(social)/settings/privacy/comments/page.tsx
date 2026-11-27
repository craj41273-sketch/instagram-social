import { requireProfile } from "@/lib/auth/dal";
import { PrivacySettingsForm } from "@/components/settings/privacy-settings-form";
import { SettingsPage } from "@/components/settings/settings-page";
import { getPrivacySettings } from "@/lib/privacy/service";

export default async function CommentPrivacyPage() {
  const current = await requireProfile();
  const initial = await getPrivacySettings(current.user.id);

  return (
    <SettingsPage
      title="Comment privacy"
      description="Control who may comment on your posts."
      currentPath="/settings/privacy/comments"
    >
      <PrivacySettingsForm scope="comments" initial={initial} />
    </SettingsPage>
  );
}
