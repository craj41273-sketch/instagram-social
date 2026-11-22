import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  label?: string;
}

/** Decorative loading indicator with an accessible status label. */
export function Spinner({ className, label = "Loading" }: SpinnerProps) {
  return (
    <LoaderCircle
      role="status"
      aria-label={label}
      className={cn("size-5 animate-spin text-primary", className)}
    />
  );
}
