import { requireProfile } from "@/lib/auth/dal";
import { RelationshipManager } from "@/components/settings/relationship-manager";
import { SettingsPage } from "@/components/settings/settings-page";
import { listRelationships } from "@/lib/privacy/relationships";

export default async function BlockedAccountsPage() {
  const current = await requireProfile();
  const items = await listRelationships(current.user.id, "block");

  return (
    <SettingsPage
      title="Blocked accounts"
      description="Blocking removes mutual follows and pending requests."
      currentPath="/settings/privacy/blocked"
    >
      <RelationshipManager kind="block" items={items} />
    </SettingsPage>
  );
}
