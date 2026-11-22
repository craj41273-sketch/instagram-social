"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface IconButtonProps extends React.ComponentProps<typeof Button> {
  label: string;
  side?: "top" | "right" | "bottom" | "left";
}

/** Accessible icon-only control with an automatic tooltip and aria-label. */
export function IconButton({
  label,
  side = "bottom",
  className,
  size = "icon",
  variant = "ghost",
  ...props
}: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={label}
          size={size}
          variant={variant}
          className={cn("rounded-full", className)}
          {...props}
        />
      </TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}
