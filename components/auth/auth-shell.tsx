import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/shared/brand";
import { ImageContainer } from "@/components/shared/image-container";
import { StatusBadge } from "@/components/ui/status-badge";
import { landingImages } from "@/lib/media";

/** Focused auth shell: editorial image panel beside a centered form column. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[0.92fr_1.08fr]">
      <aside className="relative hidden overflow-hidden border-r border-border/60 bg-surface/40 lg:block">
        <ImageContainer
          src={landingImages.heroPanorama}
          alt="Mountain lake at dusk, used as editorial artwork"
          ratio="fill"
          unoptimized
          priority
          sizes="50vw"
          className="rounded-none"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/20"
          aria-hidden="true"
        />

        <div className="relative z-10 flex h-full min-h-svh flex-col justify-between p-10 xl:p-14">
          <Link
            href="/"
            aria-label="Luma home"
            className="w-fit rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <Brand />
          </Link>

          <div className="max-w-md">
            <StatusBadge tone="brand">Photography, considered</StatusBadge>
            <p className="mt-5 font-heading text-headline">
              Every frame has a story. Find the people who will see it.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              A calm, editorial space for sharing what you notice.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Editorial photography is illustrative. No Luma accounts are
            connected yet.
          </p>
        </div>
      </aside>

      <div className="flex min-h-svh flex-col">
        <div className="flex items-center justify-between gap-4 px-4 py-5 sm:px-8">
          <Link
            href="/"
            aria-label="Luma home"
            className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring lg:hidden"
          >
            <Brand />
          </Link>
          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-2 rounded-lg text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to home
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-10 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </div>

        <p className="px-4 pb-6 text-center text-xs text-muted-foreground sm:px-8">
          Frontend preview · authentication is not connected yet.
        </p>
      </div>
    </div>
  );
}
