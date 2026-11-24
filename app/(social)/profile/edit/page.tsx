import Link from "next/link";
import { requireProfile } from "@/lib/auth/dal";
import { PageContainer } from "@/components/layout/page-container";
import { EditProfileForm } from "@/components/profile/edit-profile-form";
import { ProfileMediaForms } from "@/components/profile/profile-media-forms";
import { PremiumButton } from "@/components/ui/premium-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Owner-only route: identity comes from the DAL, never from the URL. */
export default async function EditProfilePage() {
  const current = await requireProfile();

  const initial = {
    displayName: current.profile.displayName,
    username: current.user.username,
    bio: current.profile.bio ?? "",
    website: current.profile.website ?? "",
    location: current.profile.location ?? "",
  };

  return (
    <PageContainer className="max-w-3xl space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl tracking-tight sm:text-3xl">
          Edit profile
        </h1>
        <p className="text-sm text-muted-foreground">
          Your username is the single source of truth and appears across every profile link.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile images</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileMediaForms
            avatarUrl={current.profile.avatarUrl}
            coverUrl={current.profile.coverUrl}
            displayName={current.profile.displayName}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Public details</CardTitle>
        </CardHeader>
        <CardContent>
          <EditProfileForm initial={initial} />
        </CardContent>
      </Card>

      <PremiumButton premiumVariant="ghost" asChild>
        <Link href={`/profile/${current.user.username}`}>View public profile</Link>
      </PremiumButton>
    </PageContainer>
  );
}
