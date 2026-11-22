import { CircleAlert, CircleCheck, Clock3, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type AuthAlertTone = "error" | "warning" | "success" | "info";

const styles: Record<AuthAlertTone, { wrap: string; icon: string }> = {
  error: {
    wrap: "border-destructive/30 bg-destructive/[0.07]",
    icon: "text-destructive",
  },
  warning: {
    wrap: "border-warning/30 bg-warning/[0.07]",
    icon: "text-warning",
  },
  success: {
    wrap: "border-success/30 bg-success/[0.07]",
    icon: "text-success",
  },
  info: {
    wrap: "border-primary/25 bg-primary/[0.06]",
    icon: "text-primary",
  },
};

const icons = {
  error: CircleAlert,
  warning: Clock3,
  success: CircleCheck,
  info: Info,
} as const;

interface AuthAlertProps {
  tone: AuthAlertTone;
  title: string;
  description?: string;
  className?: string;
}

/** Form-level feedback with the correct live region for its severity. */
export function AuthAlert({
  tone,
  title,
  description,
  className,
}: AuthAlertProps) {
  const Icon = icons[tone];
  const style = styles[tone];

  return (
    <div
      role={tone === "error" || tone === "warning" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3.5 text-sm",
        style.wrap,
        className,
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", style.icon)} aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-medium text-foreground">{title}</p>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
