import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { PremiumButton } from "@/components/ui/premium-button";
import { UserRoundSearch } from "lucide-react";

export default function ProfileNotFound() {
  return (
    <PageContainer className="py-10">
      <EmptyState
        icon={UserRoundSearch}
        title="Profile not found"
        description="That username does not exist, or the profile is no longer available."
        action={
          <PremiumButton premiumVariant="outline" asChild>
            <Link href="/">Back to home</Link>
          </PremiumButton>
        }
      />
    </PageContainer>
  );
}
