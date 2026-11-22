import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuthCheckboxProps {
  id: string;
  name?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  invalid?: boolean;
  describedBy?: string;
}

/** Native checkbox with a semantic, link-friendly label. */
export function AuthCheckbox({
  id,
  name,
  checked,
  onCheckedChange,
  label,
  invalid,
  describedBy,
}: AuthCheckboxProps) {
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(
          "mt-0.5 size-4 shrink-0 rounded border-input accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          invalid && "border-destructive",
        )}
      />
      <label
        htmlFor={id}
        className="text-xs leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline-offset-2 [&_a]:hover:underline"
      >
        {label}
      </label>
    </div>
  );
}
