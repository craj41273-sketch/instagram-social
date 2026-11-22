import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PremiumVariant = "gradient" | "soft" | "outline" | "ghost" | "danger";

const premiumStyles: Record<PremiumVariant, string> = {
  gradient:
    "border-0 bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-500 text-white shadow-glow hover:from-violet-400 hover:via-indigo-400 hover:to-sky-400",
  soft: "bg-primary/10 text-primary hover:bg-primary/16",
  outline: "border-border/80 bg-surface/60 hover:bg-accent",
  ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
  danger: "bg-destructive/12 text-destructive hover:bg-destructive/18",
};

const variantMap: Record<PremiumVariant, "default" | "secondary" | "outline" | "ghost" | "destructive"> = {
  gradient: "default",
  soft: "secondary",
  outline: "outline",
  ghost: "ghost",
  danger: "destructive",
};

interface PremiumButtonProps extends React.ComponentProps<typeof Button> {
  premiumVariant?: PremiumVariant;
  glow?: boolean;
}

/** Extended button styles that sit on top of the shadcn/ui Button primitive. */
export function PremiumButton({
  premiumVariant = "gradient",
  glow = true,
  className,
  ...props
}: PremiumButtonProps) {
  return (
    <Button
      variant={variantMap[premiumVariant]}
      className={cn(
        premiumStyles[premiumVariant],
        glow && premiumVariant === "gradient" && "shadow-glow",
        className,
      )}
      {...props}
    />
  );
}
