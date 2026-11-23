import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ErrorState } from "@/components/shared/error-state";
import { PageContainer } from "@/components/layout/page-container";
import { PremiumButton } from "@/components/ui/premium-button";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { getCurrentProfile } from "@/lib/auth/dal";
import { getFollowCounts, isFollowing } from "@/lib/db/follows";
import { getPublicProfileByUsername } from "@/lib/db/profiles";
import { logServerError } from "@/lib/logging";
import { usernameSchema } from "@/lib/validations/auth";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const parsed = usernameSchema.safeParse(username);

  return {
    title: parsed.success ? `@${parsed.data}` : "Profile",
    description: parsed.success
      ? `View @${parsed.data}'s profile, bio, and social connections on Luma.`
      : "View a profile on Luma.",
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const rawUsername = (await params).username;
  const username = usernameSchema.safeParse(rawUsername);
  if (!username.success) notFound();

  let profile;
  try {
    profile = await getPublicProfileByUsername(username.data);
  } catch (error) {
    logServerError("profile.page.load", error, { username: username.data });
    return <ProfileLoadError username={username.data} />;
  }
  if (!profile) notFound();

  let viewer = null;
  try {
    viewer = await getCurrentProfile();
  } catch (error) {
    logServerError("profile.page.viewer", error);
  }

  const isOwner = viewer?.user.id === profile.userId;
  let counts = { followers: 0, following: 0 };
  let following = false;

  try {
    counts = await getFollowCounts(profile.userId);
    if (viewer && !isOwner) {
      following = await isFollowing(viewer.user.id, profile.userId);
    }
  } catch (error) {
    logServerError("profile.page.social", error, { userId: profile.userId });
    return <ProfileLoadError username={profile.username} />;
  }

  return (
    <PageContainer className="space-y-6">
      <ProfileHeader
        profile={profile}
        followers={counts.followers}
        following={counts.following}
        isFollowing={following}
        isOwner={isOwner}
        viewerUsername={viewer?.user.username ?? null}
      />
      <ProfileTabs />
    </PageContainer>
  );
}

function ProfileLoadError({ username }: { username: string }) {
  return (
    <PageContainer className="py-10">
      <ErrorState
        title="This profile could not load"
        description="The service may still be starting. Try again in a moment."
        action={
          <PremiumButton premiumVariant="outline" asChild>
            <Link href={`/profile/${username}`}>Try again</Link>
          </PremiumButton>
        }
      />
    </PageContainer>
  );
}
