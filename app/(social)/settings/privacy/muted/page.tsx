import { requireProfile } from "@/lib/auth/dal";
import { RelationshipManager } from "@/components/settings/relationship-manager";
import { SettingsPage } from "@/components/settings/settings-page";
import { listRelationships } from "@/lib/privacy/relationships";

export default async function MutedAccountsPage() {
  const current = await requireProfile();
  const items = await listRelationships(current.user.id, "mute");

  return (
    <SettingsPage
      title="Muted accounts"
      description="Muted accounts stay connected but their updates are quieted."
      currentPath="/settings/privacy/muted"
    >
      <RelationshipManager kind="mute" items={items} />
    </SettingsPage>
  );
}
