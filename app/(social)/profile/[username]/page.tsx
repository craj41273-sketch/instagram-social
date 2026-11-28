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
  const [contextResult, privateResult, requestResult] = await Promise.allSettled([
    getPrivacyContext(viewerId, profile.userId),
    isPrivateProfile(profile.userId),
    getFollowRequestState(viewerId, profile.userId),
  ]);
  if (contextResult.status === "rejected") {
    logServerError("profile.page.privacy", contextResult.reason, { userId: profile.userId });
  }
  if (privateResult.status === "rejected") {
    logServerError("profile.page.privacy", privateResult.reason, { userId: profile.userId });
  }
  if (requestResult.status === "rejected") {
    logServerError("profile.page.privacy", requestResult.reason, { userId: profile.userId });
  }
  if (contextResult.status === "fulfilled" && privateResult.status === "fulfilled") {
    const context = contextResult.value;
    canView = canViewPosts({
      ...context,
      settings: { ...context.settings, isPrivate: privateResult.value },
    });
  }
  requested = requestResult.status === "fulfilled" && requestResult.value === "pending";

  const emptyList = { items: [], nextCursor: null };
  const [
    socialResult,
    postCountResult,
    followersPageResult,
    followingPageResult,
    postsResult,
    suggestionsResult,
    hypeResult,
  ] = await Promise.allSettled([
    canView
      ? (async () => {
          const counts = await getFollowCounts(profile.userId);
          const following = viewerId && !isOwner ? await isFollowing(viewerId, profile.userId) : false;
          return { counts, following };
        })()
      : Promise.resolve({ counts: { followers: 0, following: 0 }, following: false }),
    canView ? getPostCountByUserId(profile.userId) : Promise.resolve(0),
    canView
      ? listFollowers(profile.userId, { viewerUserId: viewerId, limit: LIST_PAGE_SIZE })
      : Promise.resolve(emptyList),
    canView
      ? listFollowing(profile.userId, { viewerUserId: viewerId, limit: LIST_PAGE_SIZE })
      : Promise.resolve(emptyList),
    canView
      ? listProfilePosts(profile.userId, {
          limit: LIST_PAGE_SIZE,
          viewerUserId: viewerId,
        })
      : Promise.resolve(null),
    viewerId
      ? getSuggestedUsers(viewerId, 6)
      : Promise.resolve<Awaited<ReturnType<typeof getSuggestedUsers>>>([]),
    viewerId && !isOwner
      ? getTrustStats(profile.userId, viewerId).then((stats) => stats.viewerHasHype)
      : Promise.resolve(false),
  ]);

  let counts = { followers: 0, following: 0 };
  let following = false;
  if (socialResult.status === "fulfilled") {
    counts = socialResult.value.counts;
    following = socialResult.value.following;
  } else {
    logServerError("profile.page.social", socialResult.reason, { userId: profile.userId });
    return <ProfileLoadError username={profile.username} />;
  }

  let postCount = 0;
  let postsError = false;
  if (postCountResult.status === "fulfilled") {
    postCount = postCountResult.value;
  } else {
    logServerError("profile.page.postCount", postCountResult.reason, { userId: profile.userId });
    postsError = true;
  }

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
  if (postsResult.status === "fulfilled") {
    posts = postsResult.value;
  } else if (canView) {
    logServerError("profile.page.posts", postsResult.reason, { userId: profile.userId });
    postsError = true;
  }

  let suggestions: Awaited<ReturnType<typeof getSuggestedUsers>> = [];
  if (suggestionsResult.status === "fulfilled") {
    suggestions = suggestionsResult.value;
  } else {
    logServerError("profile.page.suggestions", suggestionsResult.reason, { userId: viewerId });
  }

  let viewerHasHype = false;
  if (hypeResult.status === "fulfilled") {
    viewerHasHype = hypeResult.value;
  } else {
    logServerError("profile.page.viewerHype", hypeResult.reason, { userId: viewerId });
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

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ username: "demo" }];
}
