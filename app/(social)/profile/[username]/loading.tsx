import { PageContainer } from "@/components/layout/page-container";
import { ProfileSkeleton } from "@/components/profile/profile-skeleton";

export default function ProfileLoading() {
  return (
    <PageContainer className="space-y-6">
      <ProfileSkeleton />
    </PageContainer>
  );
}
