import Link from "next/link";
import { notFound } from "next/navigation";
import { Images } from "lucide-react";
import { StoryViewer } from "@/components/stories/story-viewer";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PremiumButton } from "@/components/ui/premium-button";
import { requireProfile } from "@/lib/auth/dal";
import { listStoryGroups } from "@/lib/db/stories";
import { parseUserId } from "@/lib/db/profile-sql";
import { logServerError } from "@/lib/logging";

interface StoryViewerPageProps {
  params: Promise<{ userId: string }>;
}

/**
 * Full-screen route. The target is only present in the service result when the
 * session-derived viewer owns it or already follows it.
 */
export default async function StoryViewerPage({ params }: StoryViewerPageProps) {
  const current = await requireProfile();
  const rawUserId = (await params).userId;
  const userId = parseUserId(rawUserId);
  if (!userId) notFound();

  let groups;
  try {
    groups = await listStoryGroups({
      viewerUserId: current.user.id,
      includeInteractions: true,
    });
  } catch (error) {
    logServerError("stories.viewer.load", error, { userId });
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <ErrorState
          title="Stories could not load"
          description="Stories are temporarily unavailable. Please try again in a moment."
          action={
            <PremiumButton premiumVariant="outline" asChild>
              <Link href="/posts">Back to feed</Link>
            </PremiumButton>
          }
        />
      </div>
    );
  }

  if (!groups.some((group) => group.userId === userId)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <EmptyState
          icon={Images}
          title="No active stories"
          description="This story may have expired, been removed, or is not available to you."
          action={
            <PremiumButton premiumVariant="outline" asChild>
              <Link href="/posts">Back to feed</Link>
            </PremiumButton>
          }
        />
      </div>
    );
  }

  return <StoryViewer groups={groups} initialUserId={userId} />;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ userId: "demo" }];
}
