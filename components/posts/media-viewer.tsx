"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, Images } from "lucide-react";
import { ImageContainer } from "@/components/shared/image-container";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PublicPostMedia } from "@/lib/db/posts";
import { safeHttpUrl } from "@/lib/profile/format";
import { cn } from "@/lib/utils";

interface MediaViewerProps {
  media: PublicPostMedia[];
  label: string;
  className?: string;
}

/** Inline gallery plus an accessible full-size viewer with keyboard/swipe controls. */
export function MediaViewer({ media, label, className }: MediaViewerProps) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const visible = media.filter((item) => safeHttpUrl(item.publicUrl));
  const count = visible.length;

  if (count === 0) {
    return (
      <ImageContainer
        alt={label}
        ratio="portrait"
        className={className}
      />
    );
  }

  const safeIndex = Math.min(active, count - 1);
  const current = visible[safeIndex]!;

  function move(delta: number) {
    if (count < 2) return;
    setActive((index) => (index + delta + count) % count);
  }

  return (
    <>
      <div className={cn("relative", className)}>
        <ImageContainer
          alt={current.altText || `${label} — image ${safeIndex + 1} of ${count}`}
          src={current.publicUrl}
          ratio="portrait"
          unoptimized
          sizes="(max-width: 768px) 100vw, 640px"
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Open media viewer for ${label}`}
          className="absolute inset-0 z-10 cursor-zoom-in rounded-2xl focus-visible:outline-2 focus-visible:outline-ring"
        />
        <span className="pointer-events-none absolute right-3 bottom-3 z-20 inline-flex items-center gap-1.5 rounded-md bg-black/65 px-2 py-1 text-xs text-white backdrop-blur-sm">
          <Images className="size-3.5" aria-hidden="true" />
          {safeIndex + 1}/{count}
        </span>
        <span className="pointer-events-none absolute top-3 right-3 z-20 rounded-md bg-black/55 p-1.5 text-white backdrop-blur-sm">
          <Expand className="size-4" aria-hidden="true" />
        </span>

        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Previous image"
              className="absolute top-1/2 left-3 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Next image"
              className="absolute top-1/2 right-3 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <ul className="mt-2 flex gap-2 overflow-x-auto pb-1" aria-label="Post images">
          {visible.map((item, index) => (
            <li key={item.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`View image ${index + 1} of ${count}`}
                aria-current={index === safeIndex ? "true" : undefined}
                className={cn(
                  "block overflow-hidden rounded-lg ring-2 transition-all focus-visible:outline-2 focus-visible:outline-ring",
                  index === safeIndex ? "ring-primary" : "ring-transparent opacity-70 hover:opacity-100",
                )}
              >
                <ImageContainer
                  alt={item.altText || `${label} thumbnail ${index + 1}`}
                  src={item.publicUrl}
                  ratio="square"
                  unoptimized
                  sizes="64px"
                  className="size-14 rounded-lg"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[92vh] max-w-5xl overflow-y-auto bg-background/95 p-3 sm:p-5"
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") move(-1);
            if (event.key === "ArrowRight") move(1);
          }}
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            if (touchStartX.current === null) return;
            const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
            if (Math.abs(delta) > 50) move(delta < 0 ? 1 : -1);
            touchStartX.current = null;
          }}
        >
          <DialogTitle className="sr-only">{label}</DialogTitle>
          <DialogDescription className="sr-only">
            Use the arrow keys, swipe, or the on-screen controls to browse {count} image
            {count === 1 ? "" : "s"}.
          </DialogDescription>

          <div className="relative">
            <ImageContainer
              alt={current.altText || `${label} — image ${safeIndex + 1} of ${count}`}
              src={current.publicUrl}
              ratio="landscape"
              fit="contain"
              unoptimized
              sizes="(max-width: 1024px) 100vw, 80vw"
              className="bg-black/40"
            />
            {count > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => move(-1)}
                  aria-label="Previous image"
                  className="absolute top-1/2 left-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur-sm hover:bg-black/85 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <ChevronLeft className="size-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => move(1)}
                  aria-label="Next image"
                  className="absolute top-1/2 right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur-sm hover:bg-black/85 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <ChevronRight className="size-5" aria-hidden="true" />
                </button>
              </>
            ) : null}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            {safeIndex + 1} of {count}
            {current.altText ? ` · ${current.altText}` : ""}
          </p>

          {count > 1 ? (
            <ul className="flex justify-center gap-2 overflow-x-auto pb-1" aria-label="All images">
              {visible.map((item, index) => (
                <li key={item.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setActive(index)}
                    aria-label={`View image ${index + 1} of ${count}`}
                    aria-current={index === safeIndex ? "true" : undefined}
                    className={cn(
                      "block overflow-hidden rounded-md ring-2 focus-visible:outline-2 focus-visible:outline-ring",
                      index === safeIndex ? "ring-primary" : "ring-transparent opacity-65",
                    )}
                  >
                    <ImageContainer
                      alt={`Image ${index + 1} thumbnail`}
                      src={item.publicUrl}
                      ratio="square"
                      unoptimized
                      sizes="48px"
                      className="size-12 rounded-md"
                    />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
