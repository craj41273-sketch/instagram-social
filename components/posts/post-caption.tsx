import Link from "next/link";
import { captionParts } from "@/lib/posts/format";
import { cn } from "@/lib/utils";

/** Renders caption text with safe links for normalized hashtags only. */
export function PostCaption({
  caption,
  className,
}: {
  caption: string;
  className?: string;
}) {
  if (!caption.trim()) return null;

  return (
    <p className={cn("whitespace-pre-wrap break-words text-sm leading-relaxed", className)}>
      {captionParts(caption).map((part, index) =>
        part.tag ? (
          <Link
            key={`${part.tag}-${index}`}
            href={`/posts?tag=${encodeURIComponent(part.tag)}`}
            className="font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            {part.text}
          </Link>
        ) : (
          <span key={`text-${index}`}>{part.text}</span>
        ),
      )}
    </p>
  );
}
