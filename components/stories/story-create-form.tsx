"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ImagePlus, UploadCloud } from "lucide-react";
import { FormField } from "@/components/shared/form-field";
import { ImageContainer } from "@/components/shared/image-container";
import { PremiumButton } from "@/components/ui/premium-button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  IMAGE_LIMITS,
  validateImageMetadata,
} from "@/lib/storage/image-validation";
import { STORY_CAPTION_MAX, STORY_OVERLAY_MAX } from "@/lib/stories/constants";

/** Authenticated story composer with a real multipart upload and progress. */
export function StoryCreateForm() {
  const router = useRouter();
  const { toast } = useToast();
  const fileId = useId();
  const captionId = useId();
  const overlayId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [textOverlay, setTextOverlay] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      xhrRef.current?.abort();
    };
  }, []);

  function chooseImage(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;

    try {
      validateImageMetadata(selected, IMAGE_LIMITS.STORY_MEDIA_BYTES);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That image is not valid.");
      return;
    }

    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(selected);
    previewRef.current = url;
    setFile(selected);
    setPreview(url);
    setError(null);
  }

  function publish() {
    if (!file || uploading) return;
    if (caption.length > STORY_CAPTION_MAX || textOverlay.length > STORY_OVERLAY_MAX) {
      setError("Shorten the caption or text overlay before publishing.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.set("image", file, file.name);
    formData.set("caption", caption.trim());
    formData.set("textOverlay", textOverlay.trim());
    formData.set("mediaMeta", "{}");

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", "/api/stories");
    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      setProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    });

    xhr.addEventListener("load", () => {
      xhrRef.current = null;
      setUploading(false);

      let payload: { storyId?: string; expiresAt?: string; error?: string } = {};
      try {
        payload = JSON.parse(xhr.responseText) as typeof payload;
      } catch {
        // A malformed response is reported with the generic status message.
      }

      if (xhr.status === 201 && payload.storyId) {
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
        previewRef.current = null;
        toast({
          title: "Story published",
          description: "It will be visible for 24 hours.",
          tone: "success",
        });
        router.push("/posts");
        router.refresh();
        return;
      }

      setProgress(0);
      setError(payload.error ?? "We could not publish that story. Please try again.");
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
    <div className="space-y-6">
      <FormField
        id={fileId}
        label="Story image"
        hint="JPEG, PNG, WebP, or GIF up to 10 MB. Stories expire after 24 hours."
        error={error ?? undefined}
      >
        <Input
          id={fileId}
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={chooseImage}
          disabled={uploading}
          className="cursor-pointer"
        />
      </FormField>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="block w-full rounded-xl text-left focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
        aria-label="Choose a story image"
      >
        <ImageContainer
          alt={preview ? "Preview of your story image" : "Choose a story image"}
          src={preview ?? undefined}
          ratio="portrait"
          fit="cover"
          unoptimized
          className="mx-auto max-h-[62vh] w-full max-w-sm"
        />
        {!preview ? (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImagePlus className="size-7" aria-hidden="true" />
            <span className="text-sm font-medium">Select an image</span>
          </span>
        ) : null}
      </button>

      <FormField
        id={captionId}
        label="Caption"
        hint={`${caption.length}/${STORY_CAPTION_MAX} characters`}
      >
        <Textarea
          id={captionId}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          maxLength={STORY_CAPTION_MAX}
          placeholder="Add a caption (optional)"
          disabled={uploading}
        />
      </FormField>

      <FormField
        id={overlayId}
        label="Text overlay"
        hint={`${textOverlay.length}/${STORY_OVERLAY_MAX} characters`}
      >
        <Input
          id={overlayId}
          value={textOverlay}
          onChange={(event) => setTextOverlay(event.target.value)}
          maxLength={STORY_OVERLAY_MAX}
          placeholder="A few words on the image (optional)"
          disabled={uploading}
        />
      </FormField>

      {uploading ? (
        <div className="space-y-2" role="status" aria-live="polite">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            <span>Uploading story… {progress}%</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label="Story upload progress"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-150 ease-soft"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <PremiumButton premiumVariant="ghost" asChild>
          <Link href="/posts">Cancel</Link>
        </PremiumButton>
        <PremiumButton onClick={publish} disabled={!file || uploading}>
          {uploading ? (
            <>
              <Spinner />
              Publishing
            </>
          ) : (
            <>
              <UploadCloud aria-hidden="true" />
              Publish story
            </>
          )}
        </PremiumButton>
      </div>
    </div>
  );
}
