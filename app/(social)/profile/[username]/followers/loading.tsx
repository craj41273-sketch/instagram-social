import { PageContainer } from "@/components/layout/page-container";
import { UserListSkeleton } from "@/components/profile/profile-skeleton";

export default function FollowersLoading() {
  return (
    <PageContainer className="max-w-3xl space-y-6">
      <UserListSkeleton />
    </PageContainer>
  );
}
