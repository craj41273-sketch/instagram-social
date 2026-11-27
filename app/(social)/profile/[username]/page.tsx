import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ErrorState } from "@/components/shared/error-state";
import { PageContainer } from "@/components/layout/page-container";
import { PremiumButton } from "@/components/ui/premium-button";
import { HypeButton } from "@/components/profile/hype-button";
import { ProfessionalProfile } from "@/components/profile/professional-profile";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfilePostsGrid } from "@/components/profile/profile-posts-grid";
import { ReputationBars } from "@/components/profile/reputation-bars";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { UserList } from "@/components/profile/user-list";
import { getCurrentProfile } from "@/lib/auth/dal";
import { getFollowCounts, isFollowing, listFollowers, listFollowing } from "@/lib/db/follows";
import { getPostCountByUserId, listProfilePosts } from "@/lib/db/posts";
import { getPublicProfileByUsername, isPrivateProfile } from "@/lib/db/profiles";
import { getSuggestedUsers } from "@/lib/db/users";
import {
  canViewPosts,
  getPrivacyContext,
} from "@/lib/privacy/service";
import { getFollowRequestState } from "@/lib/privacy/relationships";
import { logServerError } from "@/lib/logging";
import { LIST_PAGE_SIZE } from "@/lib/pagination";
import { getTrustStats } from "@/lib/trust/service";
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
      ? `View @${parsed.data}'s profile, posts, bio, and social connections on Luma.`
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
  const viewerId = viewer?.user.id ?? null;
  const viewerUsername = viewer?.user.username ?? null;

  let canView = false;
  let requested = false;
  try {
    const context = await getPrivacyContext(viewerId, profile.userId);
    const privateProfile = await isPrivateProfile(profile.userId);
    canView = canViewPosts({
      ...context,
      settings: { ...context.settings, isPrivate: privateProfile },
    });
    requested = (await getFollowRequestState(viewerId, profile.userId)) === "pending";
  } catch (error) {
    logServerError("profile.page.privacy", error, { userId: profile.userId });
  }

  let counts = { followers: 0, following: 0 };
  let following = false;
  if (canView) {
    try {
      counts = await getFollowCounts(profile.userId);
      if (viewerId && !isOwner) {
        following = await isFollowing(viewerId, profile.userId);
      }
    } catch (error) {
      logServerError("profile.page.social", error, { userId: profile.userId });
      return <ProfileLoadError username={profile.username} />;
    }
  }

  let postCount = 0;
  let postsError = false;
  if (canView) {
    try {
      postCount = await getPostCountByUserId(profile.userId);
    } catch (error) {
      logServerError("profile.page.postCount", error, { userId: profile.userId });
      postsError = true;
    }
  }

  const emptyList = { items: [], nextCursor: null };
  const [followersPageResult, followingPageResult] = canView
    ? await Promise.allSettled([
        listFollowers(profile.userId, { viewerUserId: viewerId, limit: LIST_PAGE_SIZE }),
        listFollowing(profile.userId, { viewerUserId: viewerId, limit: LIST_PAGE_SIZE }),
      ])
    : [
        { status: "fulfilled" as const, value: emptyList },
        { status: "fulfilled" as const, value: emptyList },
      ];

  if (followersPageResult.status === "rejected") {
    logServerError("profile.page.followers", followersPageResult.reason, {
      userId: profile.userId,
    });
  }
  if (followingPageResult.status === "rejected") {
    logServerError("profile.page.following", followingPageResult.reason, {
      userId: profile.userId,
    });
  }

  if (
    followersPageResult.status === "rejected" ||
    followingPageResult.status === "rejected"
  ) {
    return <ProfileLoadError username={profile.username} />;
  }

  let posts = null;
  if (canView && !postsError) {
    try {
      posts = await listProfilePosts(profile.userId, {
        limit: LIST_PAGE_SIZE,
        viewerUserId: viewerId,
      });
    } catch (error) {
      logServerError("profile.page.posts", error, { userId: profile.userId });
      postsError = true;
    }
  }

  let suggestions: Awaited<ReturnType<typeof getSuggestedUsers>> = [];
  if (viewerId) {
    try {
      suggestions = await getSuggestedUsers(viewerId, 6);
    } catch (error) {
      logServerError("profile.page.suggestions", error, { userId: viewerId });
    }
  }

  let viewerHasHype = false;
  if (viewerId && !isOwner) {
    try {
      viewerHasHype = (await getTrustStats(profile.userId, viewerId)).viewerHasHype;
    } catch (error) {
      logServerError("profile.page.viewerHype", error, { userId: viewerId });
    }
  }

  return (
    <PageContainer className="space-y-6">
      <ProfileHeader
        profile={profile}
        posts={postCount}
        followers={counts.followers}
        following={counts.following}
        isFollowing={following}
        initialRequested={requested}
        isOwner={isOwner}
        viewerUsername={viewerUsername}
        initialFollowers={followersPageResult.value}
        initialFollowing={followingPageResult.value}
        listLimit={LIST_PAGE_SIZE}
      />

      {canView ? (
        <ProfessionalProfile targetId={profile.userId} viewerId={viewerId} />
      ) : null}

      <ReputationBars targetId={profile.userId} viewerId={viewerId} />

      {viewerId && !isOwner ? (
        <div className="flex flex-wrap items-center gap-3">
          <HypeButton targetUsername={profile.username} initialActive={viewerHasHype} />
          <p className="text-xs text-muted-foreground">
            Trust hypes are reversible community signals, not endorsements.
          </p>
        </div>
      ) : null}

      <ProfileTabs
        posts={
          postsError ? (
            <ErrorState
              title="Posts could not load"
              description="The post service is temporarily unavailable. Please try again."
            />
          ) : (
            <ProfilePostsGrid page={posts ?? { items: [], nextCursor: null }} />
          )
        }
      />

      {viewerId && suggestions.length > 0 ? (
        <section aria-labelledby="suggested-users-heading">
          <div className="mb-3">
            <h2 id="suggested-users-heading" className="font-heading text-lg tracking-tight">
              Suggested for you
            </h2>
            <p className="text-xs text-muted-foreground">
              Real accounts from Luma that you do not follow yet.
            </p>
          </div>
          <UserList
            items={suggestions}
            viewerUsername={viewerUsername}
            emptyTitle="No suggestions right now"
            emptyDescription="Check back as more people join Luma."
          />
        </section>
      ) : null}
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
