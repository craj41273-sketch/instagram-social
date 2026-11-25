import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { CommentSection } from "@/components/posts/comment-section";
import { PostCard } from "@/components/posts/post-card";
import { ErrorState } from "@/components/shared/error-state";
import { PremiumButton } from "@/components/ui/premium-button";
import { getCurrentProfile } from "@/lib/auth/dal";
import { listComments } from "@/lib/db/engagement";
import { getPublicPostById } from "@/lib/db/posts";
import { logServerError } from "@/lib/logging";
import { commentPageQuerySchema } from "@/lib/validations/post";

interface PostPageProps {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ cursor?: string }>;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { postId } = await params;
  return {
    title: "Post",
    description: `View post ${postId} on Luma.`,
    robots: { index: false, follow: true },
  };
}

/** Post detail with DB-derived like state and paginated, owner-managed comments. */
export default async function PostPage({ params, searchParams }: PostPageProps) {
  const { postId } = await params;
  const parsedQuery = commentPageQuerySchema.safeParse(await searchParams);
  const query = parsedQuery.success
    ? parsedQuery.data
    : { cursor: undefined, limit: 12 };

  let viewer = null;
  try {
    viewer = await getCurrentProfile();
  } catch (error) {
    logServerError("post.page.viewer", error);
  }

  let post = null;
  let comments = null;
  try {
    [post, comments] = await Promise.all([
      getPublicPostById(postId, viewer?.user.id ?? null),
      listComments(postId, { limit: query.limit, cursor: query.cursor }),
    ]);
  } catch (error) {
    logServerError("post.page.load", error, { postId });
    return (
      <PageContainer className="max-w-2xl py-10">
        <ErrorState
          title="This post could not load"
          description="The post service is temporarily unavailable. Please try again."
          action={
            <PremiumButton premiumVariant="outline" asChild>
              <Link href="/posts">Back to the feed</Link>
            </PremiumButton>
          }
        />
      </PageContainer>
    );
  }
  if (!post) notFound();

  return (
    <PageContainer className="max-w-2xl space-y-5">
      <PremiumButton premiumVariant="ghost" asChild>
        <Link href="/posts">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to feed
        </Link>
      </PremiumButton>
      <PostCard
        post={post}
        viewerUserId={viewer?.user.id ?? null}
        redirectAfterDelete="/posts"
        detail
      />
      <CommentSection
        postId={post.id}
        comments={comments.items}
        count={post.commentCount}
        viewerUserId={viewer?.user.id ?? null}
        nextCursor={comments.nextCursor}
      />
    </PageContainer>
  );
}
