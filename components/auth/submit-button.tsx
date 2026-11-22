import * as React from "react";
import { PremiumButton } from "@/components/ui/premium-button";
import { Spinner } from "@/components/ui/spinner";

interface SubmitButtonProps
  extends Omit<React.ComponentProps<typeof PremiumButton>, "children"> {
  label: string;
  loading?: boolean;
  loadingLabel?: string;
}

/** Full-width primary action with an honest in-flight state. */
export function SubmitButton({
  label,
  loading = false,
  loadingLabel = "Please wait…",
  disabled,
  ...props
}: SubmitButtonProps) {
  return (
    <PremiumButton
      type="submit"
      size="lg"
      disabled={disabled || loading}
      className="w-full"
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Spinner className="size-4 text-current" label="Submitting" />
          {loadingLabel}
        </>
      ) : (
        label
      )}
    </PremiumButton>
  );
}
