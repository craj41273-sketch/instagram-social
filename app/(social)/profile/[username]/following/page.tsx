import { notFound } from "next/navigation";
import {
  SocialListError,
  SocialListView,
} from "@/components/profile/social-list-view";
import { loadSocialList } from "@/lib/profile/social-list-data";

interface SocialListPageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ cursor?: string; limit?: string }>;
}

export default async function FollowingPage({
  params,
  searchParams,
}: SocialListPageProps) {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  const result = await loadSocialList(
    "following",
    username,
    query.cursor,
    query.limit,
  );

  if (result.status === "not-found") notFound();
  if (result.status === "error") {
    return <SocialListError username={result.username} direction="following" />;
  }

  const { profile, page, viewerUsername, limit } = result.data;
  const nextHref = page.nextCursor
    ? `/profile/${profile.username}/following?limit=${limit}&cursor=${encodeURIComponent(page.nextCursor)}`
    : null;

  return (
    <SocialListView
      username={profile.username}
      direction="following"
      page={page}
      viewerUsername={viewerUsername}
      nextHref={nextHref}
    />
  );
}
