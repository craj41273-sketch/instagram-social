"use client";

import * as React from "react";
import { Toast as ToastPrimitive } from "radix-ui";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "default" | "success" | "error" | "warning";

interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
  dismissAll: () => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const toneIcons = {
  default: Info,
  success: CircleCheck,
  error: CircleAlert,
  warning: CircleAlert,
} as const;

const toneStyles: Record<ToastTone, string> = {
  default: "bg-primary/12 text-primary",
  success: "bg-success/12 text-success",
  error: "bg-destructive/12 text-destructive",
  warning: "bg-warning/12 text-warning",
};

function ToastItemView({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: number) => void;
}) {
  const tone = item.tone ?? "default";
  const Icon = toneIcons[tone];

  return (
    <ToastPrimitive.Root
      duration={item.duration}
      onOpenChange={(open) => {
        if (!open) onDismiss(item.id);
      }}
      className={cn(
        "pointer-events-auto relative flex w-full items-start gap-3 rounded-xl border border-border bg-popover/95 p-4 text-popover-foreground shadow-lift backdrop-blur-xl",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-4",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
          toneStyles[tone],
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <ToastPrimitive.Title className="text-sm font-medium">
          {item.title}
        </ToastPrimitive.Title>
        {item.description && (
          <ToastPrimitive.Description className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {item.description}
          </ToastPrimitive.Description>
        )}
      </div>
      <ToastPrimitive.Close
        aria-label="Dismiss notification"
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <X className="size-4" aria-hidden="true" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

/** Global toast provider. Mounted once in the root layout. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const idRef = React.useRef(0);

  const toast = React.useCallback((options: ToastOptions) => {
    idRef.current += 1;
    setItems((current) => [...current, { ...options, id: idRef.current }]);
  }, []);

  const dismiss = React.useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const dismissAll = React.useCallback(() => setItems([]), []);

  const value = React.useMemo(
    () => ({ toast, dismissAll }),
    [toast, dismissAll],
  );

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4500}>
        {children}
        {items.map((item) => (
          <ToastItemView key={item.id} item={item} onDismiss={dismiss} />
        ))}
        <ToastPrimitive.Viewport className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 outline-none sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[380px]" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}
