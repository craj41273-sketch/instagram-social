"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { ImageContainer } from "@/components/shared/image-container";
import { PremiumButton } from "@/components/ui/premium-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { extractHashtags } from "@/lib/posts/hashtags";
import {
  IMAGE_LIMITS,
  validateImageMetadata,
} from "@/lib/storage/image-validation";
import { cn } from "@/lib/utils";

interface SelectedImage {
  id: string;
  file: File;
  previewUrl: string;
  width: number | null;
  height: number | null;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function readDimensions(file: File): Promise<{ width: number | null; height: number | null }> {
  try {
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(file);
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dimensions;
    }
  } catch {
    // Browser support varies; dimensions are optional display hints only.
  }
  return { width: null, height: null };
}

/** Authenticated create-post modal with drag-and-drop, ordering, and progress. */
export function CreatePostDialog() {
  const router = useRouter();
  const { toast } = useToast();
  const inputId = useId();
  const captionId = useId();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SelectedImage[]>([]);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const previewUrls = useRef<string[]>([]);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const tags = extractHashtags(caption);
  const canPublish =
    selected.length > 0 && caption.trim().length > 0 && !uploading;

  useEffect(() => {
    const urls = previewUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      xhrRef.current?.abort();
    };
  }, []);

  function reset() {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current = [];
    setSelected([]);
    setCaption("");
    setError(null);
    setProgress(0);
    setDragging(false);
    setDraggedId(null);
    setOpen(false);
  }

  async function addFiles(incoming: File[]) {
    if (incoming.length === 0) return;
    setError(null);

    const accepted: SelectedImage[] = [];
    for (const file of incoming) {
      if (selected.length + accepted.length >= IMAGE_LIMITS.MAX_POST_MEDIA) {
        setError(`You can add up to ${IMAGE_LIMITS.MAX_POST_MEDIA} images.`);
        break;
      }

      try {
        validateImageMetadata(file, IMAGE_LIMITS.POST_MEDIA_BYTES);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "That image is not valid.");
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.push(previewUrl);
      const dimensions = await readDimensions(file);
      accepted.push({
        id: newId(),
        file,
        previewUrl,
        width: dimensions.width,
        height: dimensions.height,
      });
    }

    if (accepted.length > 0) {
      setSelected((current) => [...current, ...accepted].slice(0, IMAGE_LIMITS.MAX_POST_MEDIA));
    }
  }

  function removeImage(id: string) {
    const target = selected.find((item) => item.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    previewUrls.current = previewUrls.current.filter((url) => url !== target?.previewUrl);
    setSelected((current) => current.filter((item) => item.id !== id));
  }

  function moveImage(from: number, to: number) {
    if (to < 0 || to >= selected.length || from === to) return;
    setSelected((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      if (!moved) return current;
      next.splice(to, 0, moved);
      return next;
    });
  }

  function handleReorderDrop(targetIndex: number) {
    if (!draggedId) return;
    const from = selected.findIndex((item) => item.id === draggedId);
    if (from >= 0) moveImage(from, targetIndex);
    setDraggedId(null);
  }

  function publish() {
    if (!canPublish) return;
    setError(null);
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.set("caption", caption.trim());
    formData.set(
      "mediaMeta",
      JSON.stringify(
        selected.map((item) => ({
          width: item.width,
          height: item.height,
          altText: null,
        })),
      ),
    );
    for (const item of selected) {
      formData.append("media", item.file, item.file.name);
    }

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", "/api/posts");
    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      setProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    });
    xhr.addEventListener("load", () => {
      xhrRef.current = null;
      setUploading(false);

      let payload: { postId?: string; error?: string } = {};
      try {
        payload = JSON.parse(xhr.responseText) as typeof payload;
      } catch {
        // Handled by the generic status message below.
      }

      if (xhr.status === 201 && payload.postId) {
        const postId = payload.postId;
        reset();
        toast({
          title: "Post published",
          description: "Your photos are now part of the feed.",
          tone: "success",
        });
        router.push(`/post/${postId}`);
        return;
      }

      setProgress(0);
      setError(payload.error ?? "We could not publish that post. Please try again.");
    });
    xhr.addEventListener("error", () => {
      xhrRef.current = null;
      setUploading(false);
      setProgress(0);
      setError("The upload was interrupted. Please check your connection and try again.");
    });
    xhr.send(formData);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (uploading && !next) return;
        if (next) setOpen(true);
        else reset();
      }}
    >
      <DialogTrigger asChild>
        <PremiumButton premiumVariant="gradient" size="lg">
          <ImagePlus className="size-4" aria-hidden="true" />
          Create post
        </PremiumButton>
      </DialogTrigger>

      <DialogContent
        className="max-h-[92vh] max-w-2xl overflow-y-auto"
        showCloseButton={!uploading}
        onEscapeKeyDown={(event) => {
          if (uploading) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (uploading) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Create a post</DialogTitle>
          <DialogDescription>
            Share up to {IMAGE_LIMITS.MAX_POST_MEDIA} images. Drag photos onto the
            drop area, reorder them, and add a caption with hashtags.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div
            onDragEnter={(event) => {
              event.preventDefault();
              if (!uploading) setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              if (!uploading) void addFiles(Array.from(event.dataTransfer.files));
            }}
            className={cn(
              "rounded-2xl border border-dashed p-5 text-center transition-colors",
              dragging ? "border-primary bg-primary/8" : "border-border bg-surface/40",
            )}
          >
            <UploadCloud className="mx-auto mb-3 size-7 text-primary" aria-hidden="true" />
            <p className="text-sm font-medium">Drop images here</p>
            <p className="mt-1 text-xs text-muted-foreground">
              JPEG, PNG, WebP, or GIF · up to 10 MB each
            </p>
            <div className="mt-3 flex justify-center">
              <FormField id={inputId} label="Choose images" className="w-full max-w-xs text-left">
                <Input
                  id={inputId}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  disabled={uploading}
                  onChange={(event) => {
                    void addFiles(Array.from(event.target.files ?? []));
                    event.target.value = "";
                  }}
                />
              </FormField>
            </div>
          </div>

          {selected.length > 0 ? (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Selected images">
              {selected.map((item, index) => (
                <li
                  key={item.id}
                  draggable={!uploading}
                  onDragStart={() => setDraggedId(item.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleReorderDrop(index)}
                  className="group relative"
                >
                  <ImageContainer
                    alt={`Selected image ${index + 1}`}
                    src={item.previewUrl}
                    ratio="square"
                    unoptimized
                    sizes="180px"
                    className="rounded-xl"
                  />
                  <span className="absolute top-1.5 left-1.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] text-white">
                    {index + 1}
                  </span>
                  <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => moveImage(index, index - 1)}
                      disabled={uploading || index === 0}
                      aria-label={`Move image ${index + 1} earlier`}
                      className="rounded-md bg-black/70 p-1.5 text-white disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <ArrowLeft className="size-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage(item.id)}
                      disabled={uploading}
                      aria-label={`Remove image ${index + 1}`}
                      className="rounded-md bg-destructive/85 p-1.5 text-white disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(index, index + 1)}
                      disabled={uploading || index === selected.length - 1}
                      aria-label={`Move image ${index + 1} later`}
                      className="rounded-md bg-black/70 p-1.5 text-white disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          <FormField
            id={captionId}
            label="Caption"
            hint="Hashtags such as #sunset are indexed automatically."
            error={error ?? undefined}
          >
            <Textarea
              id={captionId}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              maxLength={2200}
              rows={5}
              placeholder="Tell the story behind these photos…"
              disabled={uploading}
              aria-invalid={Boolean(error) || undefined}
            />
          </FormField>

          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5" aria-label="Detected hashtags">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-primary/12 px-2.5 py-1 text-xs text-primary"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}

          {uploading ? (
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label="Upload progress"
              className="space-y-2"
            >
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading {selected.length} image{selected.length === 1 ? "" : "s"}…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-sky-500 transition-[width] duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <PremiumButton
            premiumVariant="ghost"
            onClick={reset}
            disabled={uploading}
          >
            <X className="size-4" aria-hidden="true" />
            Cancel
          </PremiumButton>
          <PremiumButton
            premiumVariant="gradient"
            onClick={publish}
            disabled={!canPublish}
            aria-busy={uploading || undefined}
          >
            {uploading ? (
              <>
                <Spinner className="size-4 text-current" label="Publishing post" />
                Publishing…
              </>
            ) : (
              "Publish"
            )}
          </PremiumButton>
        </DialogFooter>

        <p className="text-center text-[11px] text-muted-foreground">
          Images are stored in Supabase Storage. Only validated metadata is saved in the database.
        </p>
      </DialogContent>
    </Dialog>
  );
}

/** Public-facing control with an honest sign-in path for guests. */
export function CreatePostControl({ isAuthenticated }: { isAuthenticated: boolean }) {
  if (!isAuthenticated) {
    return (
      <PremiumButton premiumVariant="soft" size="lg" asChild>
        <Link href="/login?next=%2Fposts">Sign in to post</Link>
      </PremiumButton>
    );
  }

  return <CreatePostDialog />;
}
