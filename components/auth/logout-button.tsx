import { logoutAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/auth/submit-button";

/** Real Supabase sign-out; Block 5 will move it into the authenticated shell. */
export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <SubmitButton
        label="Log out"
        loadingLabel="Signing out…"
        premiumVariant="outline"
      />
    </form>
  );
}
