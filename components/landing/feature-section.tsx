import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

interface FeatureSectionProps {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  visual: ReactNode;
  reverse?: boolean;
}

/** Alternating editorial feature row with a dedicated illustrative visual. */
export function FeatureSection({
  id,
  eyebrow,
  title,
  description,
  points,
  visual,
  reverse = false,
}: FeatureSectionProps) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className={cn(reverse && "lg:order-2")}>
          <StatusBadge tone="brand">{eyebrow}</StatusBadge>
          <h3 className="mt-5 font-heading text-headline">{title}</h3>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
          <ul className="mt-7 space-y-3">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <Check className="size-3" aria-hidden="true" />
                </span>
                <span className="text-muted-foreground">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={cn("relative", reverse && "lg:order-1")}>
          <div
            className="absolute -inset-5 rounded-[2.5rem] bg-primary/[0.05] blur-2xl"
            aria-hidden="true"
          />
          <div className="relative rounded-3xl border border-border/60 bg-surface/60 p-4 shadow-soft sm:p-6">
            {visual}
          </div>
        </div>
      </div>
    </section>
  );
}
