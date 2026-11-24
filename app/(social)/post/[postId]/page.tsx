import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { PostCard } from "@/components/posts/post-card";
import { ErrorState } from "@/components/shared/error-state";
import { PremiumButton } from "@/components/ui/premium-button";
import { getCurrentProfile } from "@/lib/auth/dal";
import { getPublicPostById } from "@/lib/db/posts";
import { logServerError } from "@/lib/logging";

interface PostPageProps {
  params: Promise<{ postId: string }>;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { postId } = await params;
  return {
    title: "Post",
    description: `View post ${postId} on Luma.`,
    robots: { index: false, follow: true },
  };
}

/** Public detail route; identity is read only to decide whether to show owner controls. */
export default async function PostPage({ params }: PostPageProps) {
  const { postId } = await params;

  let post = null;
  try {
    post = await getPublicPostById(postId);
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

  let viewer = null;
  try {
    viewer = await getCurrentProfile();
  } catch (error) {
    logServerError("post.page.viewer", error);
  }

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
    </PageContainer>
  );
}
