import type { ReactNode } from "react";
import { BadgeCheck } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserPreviewProps {
  name: string;
  handle?: string;
  avatarSrc?: string;
  verified?: boolean;
  online?: boolean;
  trailing?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const avatarSizes = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
} as const;

/** Compact identity summary used across comments, search, and messages. */
export function UserPreview({
  name,
  handle,
  avatarSrc,
  verified = false,
  online = false,
  trailing,
  size = "md",
  className,
}: UserPreviewProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div className="relative shrink-0">
        <Avatar className={avatarSizes[size]}>
          {avatarSrc && <AvatarImage src={avatarSrc} alt={name} />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        {online && (
          <span
            aria-label="Online"
            className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-background bg-success"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          {verified && (
            <BadgeCheck
              className="size-4 shrink-0 text-primary"
              aria-label="Verified"
            />
          )}
        </div>
        {handle && (
          <p className="truncate text-xs text-muted-foreground">{handle}</p>
        )}
      </div>
      {trailing}
    </div>
  );
}
