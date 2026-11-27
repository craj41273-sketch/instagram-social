import { eq } from "drizzle-orm";
import { requireProfile } from "@/lib/auth/dal";
import { CloseFriendManager } from "@/components/settings/close-friend-manager";
import { PrivacySettingsForm } from "@/components/settings/privacy-settings-form";
import { SettingsPage } from "@/components/settings/settings-page";
import { getDb } from "@/lib/db";
import { closeFriends, profiles, users } from "@/lib/db/schema";
import { logServerError } from "@/lib/logging";
import { getPrivacySettings } from "@/lib/privacy/service";

export default async function StoryPrivacyPage() {
  const current = await requireProfile();
  const [initial, closeFriendsList] = await Promise.all([
    getPrivacySettings(current.user.id),
    (async () => {
      try {
        const rows = await getDb()
          .select({
            userId: users.id,
            username: users.username,
            displayName: profiles.displayName,
            avatarUrl: profiles.avatarUrl,
          })
          .from(closeFriends)
          .innerJoin(users, eq(users.id, closeFriends.memberId))
          .leftJoin(profiles, eq(profiles.userId, users.id))
          .where(eq(closeFriends.ownerId, current.user.id))
          .orderBy(closeFriends.createdAt);
        return rows.map((row) => ({
          ...row,
          displayName: row.displayName ?? row.username,
        }));
      } catch (error) {
        logServerError("settings.closeFriends", error, { userId: current.user.id });
        return [];
      }
    })(),
  ]);

  return (
    <SettingsPage
      title="Story privacy"
      description="Set the default audience and interaction rules for your stories."
      currentPath="/settings/privacy/stories"
    >
      <PrivacySettingsForm scope="stories" initial={initial} />
      <CloseFriendManager items={closeFriendsList} />
    </SettingsPage>
  );
}
