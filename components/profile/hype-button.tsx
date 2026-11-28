"use client";

import { useState, useTransition } from "react";
import { toggleTrustHypeAction } from "@/lib/static/actions";
import { initialActionState } from "@/lib/static/actions";
import { PremiumButton } from "@/components/ui/premium-button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/** One session-derived hype per pair, with an instant reversible state. */
export function HypeButton({
  targetUsername,
  initialActive,
  compact = false,
}: {
  targetUsername: string;
  initialActive: boolean;
  compact?: boolean;
}) {
  const [active, setActive] = useState(initialActive);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !active;
    setActive(next);
    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("username", targetUsername);
      try {
        const result = await toggleTrustHypeAction(initialActionState(), formData);
        if (result.status === "error") {
          setActive(!next);
          setError(result.message ?? "We could not update your hype. Please try again.");
        } else if (typeof result.active === "boolean") {
          setActive(result.active);
        }
      } catch {
        setActive(!next);
        setError("We could not update your hype. Please try again.");
      }
    });
  }

  return (
    <div className={cn("flex flex-col items-start gap-1", compact && "items-end")}>
      <PremiumButton
        type="button"
        premiumVariant={active ? "soft" : "outline"}
        size={compact ? "sm" : "default"}
        aria-pressed={active}
        aria-busy={pending || undefined}
        disabled={pending}
        onClick={toggle}
      >
        {pending ? <Spinner className="size-4 text-current" label="Updating hype" /> : null}
        {active ? "Withdraw hype" : "Hype"}
      </PremiumButton>
      {error ? (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
