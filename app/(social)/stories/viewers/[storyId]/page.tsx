import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, ImageOff } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PremiumButton } from "@/components/ui/premium-button";
import { requireProfile } from "@/lib/auth/dal";
import { parseUserId } from "@/lib/db/profile-sql";
import { getStoryViewerList } from "@/lib/db/stories";
import { logServerError } from "@/lib/logging";

interface ViewerListPageProps {
  params: Promise<{ storyId: string }>;
}

/** Owner-only viewer list; the service returns null for every non-owner. */
export default async function StoryViewerListPage({ params }: ViewerListPageProps) {
  const current = await requireProfile();
  const storyId = parseUserId((await params).storyId);
  if (!storyId) notFound();

  let viewers;
  try {
    viewers = await getStoryViewerList(storyId, current.user.id);
  } catch (error) {
    logServerError("stories.viewers.load", error, { storyId });
    return (
      <PageContainer className="max-w-xl py-10">
        <ErrorState
          title="Viewers could not load"
          description="Viewer information is temporarily unavailable. Please try again."
          action={
            <PremiumButton premiumVariant="outline" asChild>
              <Link href={`/stories/${current.user.id}`}>Back to story</Link>
            </PremiumButton>
          }
        />
      </PageContainer>
    );
  }

  if (viewers === null) notFound();

  return (
    <PageContainer className="max-w-xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-primary">Story insights</p>
        <h1 className="mt-1 font-heading text-2xl tracking-tight sm:text-3xl">
          Who viewed your story
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Unique viewers only. The list is private to you.
        </p>
      </div>

      {viewers.length === 0 ? (
        <EmptyState
          icon={ImageOff}
          title="No viewers yet"
          description="When someone opens this story, they will appear here."
        />
      ) : (
        <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-surface/50">
          {viewers.map((viewer) => (
            <li key={viewer.userId} className="flex items-center gap-3 p-4">
              <ProfileAvatar
                name={viewer.displayName}
                src={viewer.avatarUrl}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{viewer.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">@{viewer.username}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                <Eye className="size-3.5" aria-hidden="true" />
                <time dateTime={viewer.viewedAt}>
                  {new Date(viewer.viewedAt).toLocaleString("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </time>
              </div>
            </li>
          ))}
        </ul>
      )}

      <PremiumButton premiumVariant="ghost" asChild>
        <Link href={`/stories/${current.user.id}`}>Back to story</Link>
      </PremiumButton>
    </PageContainer>
  );
}
