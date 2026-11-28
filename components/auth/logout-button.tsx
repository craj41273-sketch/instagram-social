"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SubmitButton } from "@/components/auth/submit-button";
import { createSupabaseBrowserClient } from "@/lib/auth/client";

/** Browser-side Supabase sign-out; GitHub Pages has no Server Actions. */
export function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function logout() {
    try {
      await createSupabaseBrowserClient().auth.signOut();
      router.refresh();
    } catch {
      setError("Sign out needs Supabase public configuration.");
    }
  }

  return (
    <form action={logout}>
      <SubmitButton
        label="Log out"
        loadingLabel="Signing out…"
        premiumVariant="outline"
      />
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
