"use client";

import { useEffect, useId, useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ImagePlus, Upload } from "lucide-react";
import { uploadProfileMediaAction } from "@/app/actions/profile-media";
import { FormField } from "@/components/shared/form-field";
import { ImageContainer } from "@/components/shared/image-container";
import { PremiumButton } from "@/components/ui/premium-button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import {
  initialMediaActionState,
  type MediaActionState,
} from "@/lib/profile/action-state";
import type { ProfileImageKind } from "@/lib/storage/paths";

interface ProfileMediaFormProps {
  kind: ProfileImageKind;
  currentUrl: string | null;
  displayName: string;
}

function UploadButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <PremiumButton
      type="submit"
      premiumVariant="soft"
      disabled={pending}
      aria-busy={pending || undefined}
    >
      {pending ? (
        <>
          <Spinner className="size-4 text-current" label={label} />
          Uploading…
        </>
      ) : (
        <>
          <Upload className="size-4" aria-hidden="true" />
          {label}
        </>
      )}
    </PremiumButton>
  );
}

export function ProfileMediaForm({
  kind,
  currentUrl,
  displayName,
}: ProfileMediaFormProps) {
  const inputId = useId();
  const [state, formAction] = useActionState<MediaActionState, FormData>(
    uploadProfileMediaAction,
    initialMediaActionState(),
  );
  const [preview, setPreview] = useState<string | null>(null);
  const isAvatar = kind === "avatar";
  const label = isAvatar ? "Avatar" : "Cover image";
  const maxMb = isAvatar ? 5 : 8;

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className={isAvatar ? "w-24 shrink-0" : "w-full max-w-56 shrink-0"}>
          <ImageContainer
            alt={isAvatar ? `${displayName}'s current avatar` : `${displayName}'s current cover`}
            src={preview ?? currentUrl ?? undefined}
            ratio={isAvatar ? "square" : "landscape"}
            unoptimized
            sizes={isAvatar ? "96px" : "224px"}
            className="rounded-xl"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <FormField
            id={inputId}
            label={label}
            hint={`JPEG, PNG, WebP, or GIF up to ${maxMb} MB`}
            error={state.status === "error" ? state.message : undefined}
          >
            <Input
              id={inputId}
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              required
              onChange={(event) => {
                if (preview) URL.revokeObjectURL(preview);
                const file = event.target.files?.[0];
                setPreview(file ? URL.createObjectURL(file) : null);
              }}
            />
          </FormField>
          <input type="hidden" name="kind" value={kind} />
          <UploadButton label={`Upload ${isAvatar ? "avatar" : "cover"}`} />
          {state.status === "success" && state.message ? (
            <p role="status" className="text-xs text-success">
              {state.message}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}

export function ProfileMediaForms({
  avatarUrl,
  coverUrl,
  displayName,
}: {
  avatarUrl: string | null;
  coverUrl: string | null;
  displayName: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ImagePlus className="size-4 text-primary" aria-hidden="true" />
        Profile images
      </div>
      <ProfileMediaForm kind="avatar" currentUrl={avatarUrl} displayName={displayName} />
      <div className="border-t border-border/60 pt-6">
        <ProfileMediaForm kind="cover" currentUrl={coverUrl} displayName={displayName} />
      </div>
    </div>
  );
}
