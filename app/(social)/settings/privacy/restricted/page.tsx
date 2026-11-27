import { requireProfile } from "@/lib/auth/dal";
import { RelationshipManager } from "@/components/settings/relationship-manager";
import { SettingsPage } from "@/components/settings/settings-page";
import { listRelationships } from "@/lib/privacy/relationships";

export default async function RestrictedAccountsPage() {
  const current = await requireProfile();
  const items = await listRelationships(current.user.id, "restrict");

  return (
    <SettingsPage
      title="Restricted accounts"
      description="Restricted accounts have limited interactions with you."
      currentPath="/settings/privacy/restricted"
    >
      <RelationshipManager kind="restrict" items={items} />
    </SettingsPage>
  );
}
