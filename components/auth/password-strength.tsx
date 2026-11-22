import { Check, X } from "lucide-react";
import { getPasswordStrength } from "@/lib/validations/auth";
import { cn } from "@/lib/utils";

const barTones = {
  danger: "bg-destructive",
  warning: "bg-warning",
  brand: "bg-primary",
  success: "bg-success",
} as const;

const labelTones = {
  danger: "text-destructive",
  warning: "text-warning",
  brand: "text-primary",
  success: "text-success",
} as const;

/** Local, non-persisted feedback that helps users choose a stronger password. */
export function PasswordStrength({ value }: { value: string }) {
  const { score, label, tone, checklist } = getPasswordStrength(value);

  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Password strength</span>
        <span className={labelTones[tone]}>{label}</span>
      </div>
      <div
        role="meter"
        aria-label="Password strength"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={score}
        className="mt-2 flex gap-1.5"
      >
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            aria-hidden="true"
            className={cn(
              "h-1.5 flex-1 rounded-full bg-muted transition-colors duration-200",
              step <= score && barTones[tone],
            )}
          />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
        {checklist.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {item.met ? (
              <Check className="size-3 text-success" aria-hidden="true" />
            ) : (
              <X className="size-3 text-muted-foreground/60" aria-hidden="true" />
            )}
            <span className={cn(item.met && "text-foreground/80")}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
