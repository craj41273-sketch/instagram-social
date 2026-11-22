import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

const toneStyles: Record<Tone, string> = {
  neutral: "border-border/70 bg-muted/50 text-muted-foreground",
  brand: "border-transparent bg-primary/12 text-primary",
  success: "border-transparent bg-success/12 text-success",
  warning: "border-transparent bg-warning/12 text-warning",
  danger: "border-transparent bg-destructive/12 text-destructive",
};

interface StatusBadgeProps extends React.ComponentProps<typeof Badge> {
  tone?: Tone;
}

/** Semantic badge tones for status, metadata, and feedback. */
export function StatusBadge({
  tone = "neutral",
  className,
  ...props
}: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(toneStyles[tone], className)}
      {...props}
    />
  );
}
