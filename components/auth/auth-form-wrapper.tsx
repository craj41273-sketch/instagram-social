import type { ReactNode } from "react";
import { StatusBadge } from "@/components/ui/status-badge";

interface AuthFormWrapperProps {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Shared card, heading, and footer region for every authentication form. */
export function AuthFormWrapper({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthFormWrapperProps) {
  return (
    <section className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-soft sm:p-8">
      <StatusBadge tone="brand">{eyebrow}</StatusBadge>
      <h1 className="mt-4 font-heading text-headline">{title}</h1>
      {description && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      <div className="mt-7">{children}</div>
      {footer && (
        <div className="mt-7 border-t border-border/60 pt-5 text-sm text-muted-foreground">
          {footer}
        </div>
      )}
    </section>
  );
}
