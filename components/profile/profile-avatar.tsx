import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { profileInitials, safeHttpUrl } from "@/lib/profile/format";
import { cn } from "@/lib/utils";

interface ProfileAvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeStyles = {
  sm: "size-9 text-xs",
  md: "size-12",
  lg: "size-20 text-xl sm:size-24",
  xl: "size-24 text-2xl sm:size-32",
} as const;

/** Profile image with a polished, always-present fallback. */
export function ProfileAvatar({
  name,
  src,
  size = "md",
  className,
}: ProfileAvatarProps) {
  const imageSrc = safeHttpUrl(src);

  return (
    <Avatar
      size={size === "md" ? "default" : size === "sm" ? "sm" : "lg"}
      className={cn(
        sizeStyles[size],
        "ring-2 ring-background shadow-lift",
        className,
      )}
    >
      {imageSrc ? <AvatarImage src={imageSrc} alt={`${name}'s avatar`} /> : null}
      <AvatarFallback className="bg-gradient-to-br from-primary/25 to-accent text-foreground">
        {profileInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
