import Link from "next/link";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { MediaViewer } from "@/components/posts/media-viewer";
import { PostActions } from "@/components/posts/post-actions";
import { PostCaption } from "@/components/posts/post-caption";
import type { PublicPost } from "@/lib/db/posts";
import { formatPostTimestamp } from "@/lib/posts/format";

interface PostCardProps {
  post: PublicPost;
  viewerUserId: string | null;
  redirectAfterDelete?: string;
  detail?: boolean;
}

/** One real database-backed post with ordered media and owner-only controls. */
export function PostCard({
  post,
  viewerUserId,
  redirectAfterDelete,
  detail = false,
}: PostCardProps) {
  const isOwner = viewerUserId === post.author.userId;
  const edited =
    new Date(post.updatedAt).getTime() - new Date(post.createdAt).getTime() > 1_000;

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader className="flex flex-row items-center gap-3">
        <Link
          href={`/profile/${post.author.username}`}
          className="rounded-full focus-visible:outline-2 focus-visible:outline-ring"
          aria-label={`View @${post.author.username}'s profile`}
        >
          <ProfileAvatar
            name={post.author.displayName}
            src={post.author.avatarUrl}
            size="sm"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate">
            <Link
              href={`/profile/${post.author.username}`}
              className="hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
            >
              {post.author.displayName}
            </Link>
          </CardTitle>
          <p className="truncate text-xs text-muted-foreground">
            <Link href={`/profile/${post.author.username}`} className="hover:text-foreground">
              @{post.author.username}
            </Link>
            {" · "}
            <Link href={`/post/${post.id}`} className="hover:text-foreground">
              {formatPostTimestamp(post.createdAt)}
            </Link>
            {edited ? <span> · edited</span> : null}
          </p>
        </div>
        {isOwner ? (
          <CardAction>
            <PostActions
              postId={post.id}
              caption={post.caption}
              redirectAfterDelete={redirectAfterDelete}
            />
          </CardAction>
        ) : null}
      </CardHeader>

      <MediaViewer
        key={post.id}
        media={post.media}
        label={`Post by @${post.author.username}`}
        className="px-4"
      />

      {post.caption ? (
        <CardContent className="pb-1">
          <PostCaption caption={post.caption} />
        </CardContent>
      ) : null}

      {detail ? (
        <CardContent className="pt-1 text-[11px] text-muted-foreground">
          {post.media.length} image{post.media.length === 1 ? "" : "s"} · published in UTC
        </CardContent>
      ) : null}
    </Card>
  );
}
