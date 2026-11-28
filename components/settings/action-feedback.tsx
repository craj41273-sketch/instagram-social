"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/lib/static/actions";

/** Inline error plus one toast per completed settings action. */
export function ActionFeedback({ state }: { state: ActionState }) {
  const { toast } = useToast();
  const { status, message } = state;

  useEffect(() => {
    if (status === "idle" || !message) return;
    toast({
      title: status === "success" ? "Saved" : "Could not save",
      description: message,
      tone: status === "success" ? "success" : "error",
    });
  }, [status, message, toast]);

  if (status === "error" && message) {
    return (
      <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {message}
      </p>
    );
  }

  return null;
}
