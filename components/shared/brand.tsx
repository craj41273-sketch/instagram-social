import { Camera } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface BrandProps {
  className?: string;
  compact?: boolean;
}

/** Application wordmark used in the shell. */
export function Brand({ className, compact = false }: BrandProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400 text-white shadow-sm">
        <Camera className="size-5" aria-hidden="true" />
      </span>
      {!compact && (
        <span className="text-base font-semibold tracking-tight">
          {APP_NAME}
        </span>
      )}
    </div>
  );
}
