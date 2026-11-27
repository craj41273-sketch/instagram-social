import { requireProfile } from "@/lib/auth/dal";
import { FollowRequestManager } from "@/components/settings/follow-request-manager";
import { SettingsPage } from "@/components/settings/settings-page";
import { listFollowers } from "@/lib/db/follows";
import {
  listIncomingFollowRequests,
  listOutgoingFollowRequests,
} from "@/lib/privacy/relationships";

export default async function FollowRequestsPage() {
  const current = await requireProfile();
  const userId = current.user.id;
  const [incoming, outgoing, followers] = await Promise.all([
    listIncomingFollowRequests(userId),
    listOutgoingFollowRequests(userId),
    listFollowers(userId, { viewerUserId: userId, limit: 50 }),
  ]);

  return (
    <SettingsPage
      title="Follow requests"
      description="Review requests, cancel your own, or remove a follower."
      currentPath="/settings/follow-requests"
    >
      <FollowRequestManager
        incoming={incoming}
        outgoing={outgoing}
        followers={followers.items}
      />
    </SettingsPage>
  );
}
