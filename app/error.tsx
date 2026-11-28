"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/shared/error-state";
import { PremiumButton } from "@/components/ui/premium-button";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error(
      "[luma:app.error]",
      JSON.stringify({ name: error.name, digest: error.digest ?? null }),
    );
  }, [error]);

  return (
    <ErrorState
      className="m-4 mt-10 sm:m-8"
      title="We lost the light for a moment"
      description="An unexpected error interrupted this view. Try again or return to the start."
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <PremiumButton onClick={reset}>Try again</PremiumButton>
          <PremiumButton premiumVariant="outline" asChild>
            <Link href="/">Go home</Link>
          </PremiumButton>
        </div>
      }
    />
  );
}
