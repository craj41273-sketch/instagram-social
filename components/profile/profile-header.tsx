import Link from "next/link";
import { CalendarDays, Link as LinkIcon, MapPin } from "lucide-react";
import { ImageContainer } from "@/components/shared/image-container";
import { PremiumButton } from "@/components/ui/premium-button";
import { FollowButton } from "@/components/profile/follow-button";
import { MessageButton } from "@/components/messaging/message-button";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { ProfileStats } from "@/components/profile/profile-stats";
import type { SocialUserPage } from "@/lib/db/follows";
import type { PublicProfile } from "@/lib/db/profiles";
import { safeHttpUrl } from "@/lib/profile/format";

interface ProfileHeaderProps {
  profile: PublicProfile;
  posts: number;
  followers: number;
  following: number;
  isFollowing: boolean;
  isOwner: boolean;
  viewerUsername: string | null;
  initialFollowers: SocialUserPage;
  initialFollowing: SocialUserPage;
  listLimit: number;
}

/** Premium, photo-first public profile header using only real profile data. */
export function ProfileHeader({
  profile,
  posts,
  followers,
  following,
  isFollowing,
  isOwner,
  viewerUsername,
  initialFollowers,
  initialFollowing,
  listLimit,
}: ProfileHeaderProps) {
  const website = safeHttpUrl(profile.website);
  const joined = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
  const loginHref = `/login?next=${encodeURIComponent(`/profile/${profile.username}`)}`;

  return (
    <section className="overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-lift">
      <ImageContainer
        alt={`${profile.displayName}'s cover`}
        src={safeHttpUrl(profile.coverUrl) ?? undefined}
        ratio="wide"
        unoptimized
        sizes="(max-width: 1024px) 100vw, 1024px"
        className="rounded-none ring-0"
      />

      <div className="relative px-5 pb-6 sm:px-8 sm:pb-8">
        <div className="-mt-12 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
          <ProfileAvatar
            name={profile.displayName}
            src={profile.avatarUrl}
            size="xl"
            className="ring-4 ring-card"
          />

          <div className="flex flex-wrap items-center gap-2 sm:pb-1">
            {isOwner ? (
              <PremiumButton premiumVariant="soft" size="lg" asChild>
                <Link href="/profile/edit">Edit profile</Link>
              </PremiumButton>
            ) : (
              <>
                <FollowButton
                  targetUsername={profile.username}
                  initialFollowing={isFollowing}
                  isAuthenticated={viewerUsername !== null}
                  isSelf={viewerUsername === profile.username}
                  loginHref={loginHref}
                />
                <MessageButton
                  username={profile.username}
                  isAuthenticated={viewerUsername !== null}
                  isSelf={viewerUsername === profile.username}
                  loginHref={loginHref}
                />
              </>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            <h1 className="font-heading text-2xl tracking-tight sm:text-3xl">
              {profile.displayName}
            </h1>
            <p className="mt-0.5 text-sm text-primary">@{profile.username}</p>

            {profile.bio ? (
              <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                {profile.bio}
              </p>
            ) : (
              <p className="mt-4 text-sm italic text-muted-foreground">
                No bio yet.
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              {profile.location ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {profile.location}
                </span>
              ) : null}
              {website ? (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 rounded-sm text-primary transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <LinkIcon className="size-3.5" aria-hidden="true" />
                  {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                Joined {joined}
              </span>
            </div>
          </div>

          <div className="lg:pb-1">
            <ProfileStats
              username={profile.username}
              posts={posts}
              followers={followers}
              following={following}
              initialFollowers={initialFollowers}
              initialFollowing={initialFollowing}
              viewerUsername={viewerUsername}
              limit={listLimit}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
