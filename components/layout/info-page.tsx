import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { StatusBadge } from "@/components/ui/status-badge";

interface InfoPageProps {
  eyebrow: string;
  title: string;
  description: string;
  sections: { heading: string; body: string }[];
}

/** Simple, honest placeholder for policy pages that are not final yet. */
export function InfoPage({
  eyebrow,
  title,
  description,
  sections,
}: InfoPageProps) {
  return (
    <PageContainer className="max-w-3xl py-16 sm:py-24">
      <StatusBadge tone="neutral">{eyebrow}</StatusBadge>
      <h1 className="mt-5 font-heading text-headline sm:text-display">{title}</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
        {description}
      </p>

      <div className="mt-10 space-y-6">
        {sections.map((section) => (
          <section
            key={section.heading}
            className="rounded-2xl border border-border/60 bg-surface/50 p-5 sm:p-6"
          >
            <h2 className="font-heading text-title">{section.heading}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {section.body}
            </p>
          </section>
        ))}
      </div>

      <Link
        href="/"
        className="mt-10 inline-flex items-center gap-2 rounded-lg text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to home
      </Link>
    </PageContainer>
  );
}
