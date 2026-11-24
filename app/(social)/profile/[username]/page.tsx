import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ErrorState } from "@/components/shared/error-state";
import { PageContainer } from "@/components/layout/page-container";
import { PremiumButton } from "@/components/ui/premium-button";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfilePostsGrid } from "@/components/profile/profile-posts-grid";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { UserList } from "@/components/profile/user-list";
import { getCurrentProfile } from "@/lib/auth/dal";
import { getFollowCounts, isFollowing, listFollowers, listFollowing } from "@/lib/db/follows";
import { getPostCountByUserId, listProfilePosts } from "@/lib/db/posts";
import { getPublicProfileByUsername } from "@/lib/db/profiles";
import { getSuggestedUsers } from "@/lib/db/users";
import { logServerError } from "@/lib/logging";
import { LIST_PAGE_SIZE } from "@/lib/pagination";
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

  let counts = { followers: 0, following: 0 };
  let following = false;
  try {
    counts = await getFollowCounts(profile.userId);
    if (viewerId && !isOwner) {
      following = await isFollowing(viewerId, profile.userId);
    }
  } catch (error) {
    logServerError("profile.page.social", error, { userId: profile.userId });
    return <ProfileLoadError username={profile.username} />;
  }

  let postCount = 0;
  let postsError = false;
  try {
    postCount = await getPostCountByUserId(profile.userId);
  } catch (error) {
    logServerError("profile.page.postCount", error, { userId: profile.userId });
    postsError = true;
  }

  const [followersPageResult, followingPageResult] = await Promise.allSettled([
    listFollowers(profile.userId, { viewerUserId: viewerId, limit: LIST_PAGE_SIZE }),
    listFollowing(profile.userId, { viewerUserId: viewerId, limit: LIST_PAGE_SIZE }),
  ]);

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
  if (!postsError) {
    try {
      posts = await listProfilePosts(profile.userId, { limit: LIST_PAGE_SIZE });
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

  return (
    <PageContainer className="space-y-6">
      <ProfileHeader
        profile={profile}
        posts={postCount}
        followers={counts.followers}
        following={counts.following}
        isFollowing={following}
        isOwner={isOwner}
        viewerUsername={viewerUsername}
        initialFollowers={followersPageResult.value}
        initialFollowing={followingPageResult.value}
        listLimit={LIST_PAGE_SIZE}
      />

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
