import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { DeleteCommentButton, CommentComposer } from "@/components/posts/comment-controls";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { ReportLink } from "@/components/reporting/report-link";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicComment } from "@/lib/db/engagement";
import { formatPostTimestamp } from "@/lib/posts/format";

interface CommentSectionProps {
  postId: string;
  comments: PublicComment[];
  count: number;
  viewerUserId: string | null;
  nextCursor: string | null;
}

/** Server-rendered comment list; only create/delete controls are interactive. */
export function CommentSection({
  postId,
  comments,
  count,
  viewerUserId,
  nextCursor,
}: CommentSectionProps) {
  const loginHref = `/login?next=${encodeURIComponent(`/post/${postId}#comments`)}`;

  return (
    <Card id="comments" className="scroll-mt-8">
      <CardHeader className="flex flex-row items-center gap-2">
        <MessageCircle className="size-4 text-primary" aria-hidden="true" />
        <CardTitle className="text-base">Comments</CardTitle>
        <span className="text-sm text-muted-foreground">{count}</span>
      </CardHeader>
      <CardContent className="space-y-5">
        <CommentComposer
          postId={postId}
          isAuthenticated={Boolean(viewerUserId)}
          loginHref={loginHref}
        />

        {comments.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No comments yet"
            description="Be the first to leave a thoughtful note on this post."
          />
        ) : (
          <ul className="space-y-4">
            {comments.map((comment) => (
              <li key={comment.id} className="flex gap-3">
                <Link
                  href={`/profile/${comment.username}`}
                  aria-label={`View @${comment.username}'s profile`}
                  className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <ProfileAvatar
                    name={comment.displayName}
                    src={comment.avatarUrl}
                    size="sm"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <Link
                      href={`/profile/${comment.username}`}
                      className="font-medium hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      @{comment.username}
                    </Link>
                    <span className="text-[11px] text-muted-foreground">
                      {formatPostTimestamp(comment.createdAt)}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {comment.content}
                  </p>
                  {viewerUserId === comment.userId ? (
                    <div className="mt-1">
                      <DeleteCommentButton commentId={comment.id} />
                    </div>
                  ) : (
                    <div className="-ml-2 mt-1">
                      <ReportLink
                        targetType="comment"
                        targetId={comment.id}
                        isAuthenticated={viewerUserId !== null}
                        loginHref={loginHref}
                      />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {nextCursor ? (
          <div className="flex justify-center">
            <Link
              href={`/post/${postId}?cursor=${encodeURIComponent(nextCursor)}#comments`}
              className="text-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              Load earlier comments
            </Link>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
