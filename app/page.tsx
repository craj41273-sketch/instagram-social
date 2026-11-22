import { ArrowRight, Layers3, Palette, Sparkles, Type } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Brand } from "@/components/shared/brand";
import { ImageContainer } from "@/components/shared/image-container";
import { PremiumButton } from "@/components/ui/premium-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { DESIGN_PRINCIPLES } from "@/lib/constants";

const principleIcons = [Sparkles, Palette, Type, Layers3] as const;

export default function Home() {
  return (
    <PageContainer className="py-14 sm:py-20 lg:py-24">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div>
          <StatusBadge tone="brand" className="mb-6">
            Design system &middot; Block 2
          </StatusBadge>
          <h1 className="max-w-2xl font-heading text-display sm:text-[4rem] lg:text-[4.5rem]">
            Light, framed beautifully.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Luma is a dark-first visual language for a modern photo-sharing
            product: quiet surfaces, violet light, generous spacing, and
            components that feel considered on every screen.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <PremiumButton asChild>
              <a href="/design-system">
                Explore the system
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </PremiumButton>
            <StatusBadge tone="neutral">No social features yet</StatusBadge>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 rounded-[3rem] bg-primary/[0.07] blur-3xl" aria-hidden="true" />
          <ImageContainer
            alt="Abstract Luma artwork"
            ratio="portrait"
            className="relative mx-auto max-w-sm shadow-lift"
          />
          <div className="absolute -bottom-5 -left-3 rounded-2xl border border-border/70 bg-card/90 p-4 shadow-lift backdrop-blur-xl sm:-left-8">
            <Brand compact />
            <p className="mt-2 text-xs text-muted-foreground">
              Premium by restraint
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Design principles" className="mt-20 sm:mt-24">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {DESIGN_PRINCIPLES.map((principle, index) => {
            const Icon = principleIcons[index] ?? Sparkles;

            return (
              <article
                key={principle.title}
                className="rounded-2xl border border-border/60 bg-card/60 p-card transition-colors duration-200 hover:border-border hover:bg-card"
              >
                <span className="mb-4 flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <h2 className="font-heading text-title">{principle.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {principle.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </PageContainer>
  );
}
