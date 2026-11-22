import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, Heart, MessagesSquare, Users } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { FeatureSection } from "@/components/landing/feature-section";
import {
  CommunityVisual,
  ConnectionVisual,
  DiscoverVisual,
  ShareVisual,
} from "@/components/landing/feature-visuals";
import { HeroComposition } from "@/components/landing/hero-composition";
import { SocialProof } from "@/components/landing/social-proof";
import { Button } from "@/components/ui/button";
import { PremiumButton } from "@/components/ui/premium-button";
import { StatusBadge } from "@/components/ui/status-badge";

export const metadata: Metadata = {
  title: "Luma — Your moments. Your people. Your world.",
  description:
    "Luma is a premium, photography-first social experience for sharing moments, discovering people, and building communities.",
};

function Preview({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <div aria-hidden="true">{children}</div>
      <p className="sr-only">{label}</p>
    </>
  );
}

export default function HomePage() {
  return (
    <>
      <HeroComposition />

      <section id="features" aria-labelledby="features-heading" className="scroll-mt-28 py-14 sm:py-20">
        <PageContainer className="max-w-6xl">
          <div className="max-w-2xl">
            <StatusBadge tone="brand">The experience</StatusBadge>
            <h2
              id="features-heading"
              className="mt-5 font-heading text-headline sm:text-[2.75rem]"
            >
              Everything you need to share. Nothing you don&apos;t.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Luma keeps the focus on photography and conversation. These
              previews are illustrative; the underlying features arrive in
              later build blocks.
            </p>
          </div>

          <div className="mt-14 space-y-20 sm:mt-16 sm:space-y-28">
            <FeatureSection
              id="share"
              eyebrow="Share moments"
              title="Post the moment, not the performance."
              description="A quiet space for the photographs you actually want to keep. Compose at your own pace and let the work speak first."
              points={[
                "A calm, image-first composer",
                "A profile arranged around your best work",
                "No counts or pressure to perform",
              ]}
              visual={
                <Preview label="Illustrative preview of a photo being shared.">
                  <ShareVisual />
                </Preview>
              }
            />

            <FeatureSection
              id="discover"
              eyebrow="Discover people"
              title="Find the people behind the perspective."
              description="Explore work by looking, not by chasing trends. Thoughtful suggestions help you find photographers whose eye you trust."
              points={[
                "A discovery grid built for exploration",
                "Suggestions based on interests, not noise",
                "Sample profiles shown here are illustrative",
              ]}
              visual={
                <Preview label="Illustrative preview of suggested sample profiles.">
                  <DiscoverVisual />
                </Preview>
              }
              reverse
            />

            <FeatureSection
              id="communities"
              eyebrow="Build communities"
              title="Small circles. Lasting conversations."
              description="Gather around a subject, a place, or a way of seeing. Communities give your photographs context and your conversations a home."
              points={[
                "Topic circles with a clear focus",
                "Shared albums and ongoing discussion",
                "Moderation foundations planned for launch",
              ]}
              visual={
                <Preview label="Illustrative preview of a sample photography circle.">
                  <CommunityVisual />
                </Preview>
              }
            />

            <FeatureSection
              id="connected"
              eyebrow="Stay connected"
              title="Keep the good conversations going."
              description="When a photograph starts a conversation, Luma gives it somewhere to live — quiet, considered, and free of clutter."
              points={[
                "Direct messages designed around shared work",
                "Replies that stay in context",
                "Messaging is not implemented in this preview",
              ]}
              visual={
                <Preview label="Illustrative preview of a sample conversation.">
                  <ConnectionVisual />
                </Preview>
              }
              reverse
            />
          </div>
        </PageContainer>
      </section>

      <SocialProof />

      <section id="about" aria-labelledby="about-heading" className="scroll-mt-28 pb-20 sm:pb-28">
        <PageContainer className="max-w-6xl">
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-surface/60 px-6 py-12 text-center sm:px-12 sm:py-16">
            <div
              className="absolute left-1/2 top-0 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
              aria-hidden="true"
            />
            <div className="relative">
              <StatusBadge tone="brand">Built in blocks</StatusBadge>
              <h2
                id="about-heading"
                className="mx-auto mt-5 max-w-2xl font-heading text-headline sm:text-[2.75rem]"
              >
                A better place for what you see.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Luma is being built deliberately. This foundation covers the
                design language, authentication, and backend; sharing,
                discovery, and messaging follow in later blocks.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <PremiumButton size="lg" asChild>
                  <Link href="/signup">
                    Create your account
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </PremiumButton>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/design-system">View design system</Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Compass className="size-3.5" aria-hidden="true" /> Discover
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-3.5" aria-hidden="true" /> Community
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MessagesSquare className="size-3.5" aria-hidden="true" /> Conversation
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Heart className="size-3.5" aria-hidden="true" /> Moments
                </span>
              </div>
            </div>
          </div>
        </PageContainer>
      </section>
    </>
  );
}
