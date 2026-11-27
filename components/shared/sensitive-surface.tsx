"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Discourages casual copy/save of private content. Browsers cannot prevent OS
 * screenshots or screen recording, so this is not a confidentiality boundary.
 */
export function SensitiveSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-sensitive="true"
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
      className={cn(
        "select-none [&_img]:pointer-events-none [&_img]:select-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
