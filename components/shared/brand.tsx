import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

interface BrandProps {
  className?: string;
  compact?: boolean;
}

/**
 * Original Luma mark: a prism silhouette with a point of light. Deliberately
 * distinct from camera-based social logos.
 */
export function Brand({ className, compact = false }: BrandProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="relative flex size-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-sky-400 shadow-[0_10px_28px_-14px_var(--primary)]">
        <span className="absolute -right-3 -top-3 size-8 rounded-full bg-white/20 blur-md" />
        <svg
          viewBox="0 0 32 32"
          className="relative size-5 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6.5 24 16 7.5 25.5 24h-19Z" />
          <circle cx="16" cy="18.5" r="3" fill="currentColor" stroke="none" />
        </svg>
      </span>
      {!compact && (
        <span className="font-heading text-lg tracking-tight">{APP_NAME}</span>
      )}
    </div>
  );
}
