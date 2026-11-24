import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Ratio = "square" | "portrait" | "landscape" | "wide" | "fill";
type ImageFit = "cover" | "contain";

const fitStyles: Record<ImageFit, string> = {
  cover: "object-cover",
  contain: "object-contain",
};

const ratioStyles: Record<Ratio, string> = {
  square: "aspect-square",
  portrait: "aspect-[4/5]",
  landscape: "aspect-[3/2]",
  wide: "aspect-[16/9]",
  fill: "absolute inset-0 size-full",
};

interface ImageContainerProps {
  alt: string;
  src?: string;
  ratio?: Ratio;
  fit?: ImageFit;
  loading?: boolean;
  priority?: boolean;
  unoptimized?: boolean;
  sizes?: string;
  className?: string;
}

/** Consistent, overflow-safe media frame with ratio and loading states. */
export function ImageContainer({
  alt,
  src,
  ratio = "square",
  fit = "cover",
  loading = false,
  priority = false,
  unoptimized = false,
  sizes = "(max-width: 768px) 100vw, 33vw",
  className,
}: ImageContainerProps) {
  return (
    <div
      className={cn(
        "group relative isolate overflow-hidden rounded-2xl bg-muted ring-1 ring-foreground/5",
        ratioStyles[ratio],
        className,
      )}
    >
      {loading ? (
        <Skeleton className="absolute inset-0 rounded-none" />
      ) : src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={unoptimized}
          className={cn(
            fitStyles[fit],
            "transition-transform duration-500 ease-soft group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100",
          )}
        />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,color-mix(in_oklch,var(--primary)_38%,transparent),transparent_55%),linear-gradient(140deg,var(--surface-elevated),var(--background))]"
        />
      )}
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/[0.06]" />
    </div>
  );
}
