import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { StoryCreateForm } from "@/components/stories/story-create-form";
import { PremiumButton } from "@/components/ui/premium-button";
import { requireProfile } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Create a story",
  description: "Publish a photo story that disappears after 24 hours.",
};

/** Authenticated story composer. Identity is never accepted from the client. */
export default async function CreateStoryPage() {
  await requireProfile();

  return (
    <PageContainer className="max-w-xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-primary">Stories</p>
        <h1 className="mt-1 font-heading text-2xl tracking-tight sm:text-3xl">
          Share a moment
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick one image, add optional words, and publish it for 24 hours.
        </p>
      </div>

      <div className="rounded-2xl border border-border/70 bg-surface/50 p-4 shadow-soft sm:p-6">
        <StoryCreateForm />
      </div>

      <PremiumButton premiumVariant="ghost" asChild>
        <Link href="/posts">Back to feed</Link>
      </PremiumButton>
    </PageContainer>
  );
}
