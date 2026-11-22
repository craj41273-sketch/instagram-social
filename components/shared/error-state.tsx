import type { LucideIcon } from "lucide-react";
import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}

/** Consistent error/failure state. Uses role="alert" for announcements. */
export function ErrorState({
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  icon: Icon = TriangleAlert,
  action,
  className,
}: ErrorStateProps) {
  return (
    <section
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/[0.04] px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-destructive/12 text-destructive">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h2 className="font-heading text-xl text-foreground">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </section>
  );
}
