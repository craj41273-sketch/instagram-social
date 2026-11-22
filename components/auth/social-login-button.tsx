import { AuthDivider } from "@/components/auth/auth-divider";
import { StatusBadge } from "@/components/ui/status-badge";

/**
 * Integration boundary for Google sign-in. The control is intentionally
 * disabled until Supabase Auth is configured so no fake auth can occur.
 */
export function SocialLoginButton() {
  return (
    <div>
      <AuthDivider label="or continue with" />
      <button
        type="button"
        disabled
        aria-describedby="google-auth-pending"
        className="flex h-11 w-full cursor-not-allowed items-center justify-center gap-3 rounded-lg border border-border bg-surface/50 px-4 text-sm font-medium text-muted-foreground opacity-70"
      >
        <span
          aria-hidden="true"
          className="flex size-5 items-center justify-center rounded-full border border-border text-[11px] font-semibold text-foreground"
        >
          G
        </span>
        Continue with Google
        <StatusBadge tone="neutral" className="ml-1">
          Pending setup
        </StatusBadge>
      </button>
      <p
        id="google-auth-pending"
        className="mt-3 text-center text-xs leading-relaxed text-muted-foreground"
      >
        Google sign-in is prepared in the UI and disabled until Supabase Auth is
        configured.
      </p>
    </div>
  );
}
