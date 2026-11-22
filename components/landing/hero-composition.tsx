import Link from "next/link";
import { ArrowRight, Heart, Sparkles } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { ImageContainer } from "@/components/shared/image-container";
import { UserPreview } from "@/components/shared/user-preview";
import { Button } from "@/components/ui/button";
import { PremiumButton } from "@/components/ui/premium-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { landingImages, sampleAvatars } from "@/lib/media";

/** Editorial hero: one dominant frame supported by smaller, layered tiles. */
export function HeroComposition() {
  return (
    <PageContainer className="max-w-6xl pb-10 pt-12 sm:pb-16 sm:pt-20 lg:pb-24 lg:pt-24">
      <section
        aria-labelledby="hero-heading"
        className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 xl:gap-16"
      >
        <div className="relative z-10">
          <StatusBadge tone="brand" className="mb-6">
            <Sparkles className="size-3" aria-hidden="true" />
            A quieter kind of social
          </StatusBadge>

          <h1
            id="hero-heading"
            className="max-w-2xl font-heading text-[2.75rem] leading-[1.03] tracking-[-0.045em] sm:text-[3.6rem] lg:text-[4.1rem]"
          >
            Your moments.
            <br />
            Your people.
            <br />
            <span className="text-primary italic">Your world.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Luma is a photography-first place to share what you see, find people
            who see it differently, and build something worth returning to.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <PremiumButton size="lg" asChild>
              <Link href="/signup">
                Start sharing
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </PremiumButton>
            <Button variant="outline" size="lg" asChild>
              <Link href="#features">See how it works</Link>
            </Button>
          </div>

          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            Frontend preview. Accounts, uploads, and social features arrive in
            later blocks.
          </p>
        </div>

        <div
          className="relative mx-auto h-[380px] w-full max-w-[540px] sm:h-[500px] lg:h-[560px]"
          aria-label="Illustrative preview of photo sharing in Luma"
        >
          <div
            className="absolute left-[12%] top-[8%] size-[70%] rounded-full bg-primary/10 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-[12%] right-[8%] size-[45%] rounded-full bg-sky-500/10 blur-3xl"
            aria-hidden="true"
          />

          <div className="absolute left-1/2 top-0 w-[58%] -translate-x-1/2 animate-float sm:w-[56%]">
            <ImageContainer
              src={landingImages.heroMain}
              alt="Golden light over a quiet mountain landscape"
              ratio="portrait"
              priority
              unoptimized
              sizes="(max-width: 1024px) 45vw, 300px"
              className="rotate-[-3deg] shadow-lift"
            />
          </div>

          <div className="absolute left-0 top-[14%] w-[38%] animate-float-slow sm:w-[36%]">
            <ImageContainer
              src={landingImages.heroTop}
              alt="Turquoise coastline photographed from above"
              ratio="portrait"
              unoptimized
              sizes="(max-width: 1024px) 30vw, 200px"
              className="rotate-[7deg] shadow-lift"
            />
          </div>

          <div className="absolute bottom-[6%] right-0 w-[44%] animate-float sm:w-[42%]">
            <ImageContainer
              src={landingImages.heroBottom}
              alt="Still alpine lake reflecting the mountains"
              ratio="square"
              unoptimized
              sizes="(max-width: 1024px) 35vw, 220px"
              className="rotate-[5deg] shadow-lift"
            />
          </div>

          <div className="absolute bottom-[14%] left-[2%] w-[62%] max-w-[260px] animate-float-slow rounded-2xl border border-border/70 bg-card/90 p-3 shadow-lift backdrop-blur-xl sm:left-[4%] sm:p-4">
            <UserPreview
              name="Maya Chen"
              handle="@maya · sample"
              avatarSrc={sampleAvatars.maya}
              verified
              online
              size="sm"
            />
            <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              <Heart className="size-3.5 text-destructive" aria-hidden="true" />
              <span>A moment worth keeping</span>
            </div>
          </div>

          <div className="absolute right-[2%] top-[4%] hidden rounded-full border border-border/70 bg-popover/90 px-3 py-2 text-xs text-muted-foreground shadow-soft backdrop-blur-xl sm:flex sm:items-center sm:gap-2">
            <span className="size-2 rounded-full bg-success" aria-hidden="true" />
            Illustrative preview
          </div>
        </div>
      </section>
    </PageContainer>
  );
}
