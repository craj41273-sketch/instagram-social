import type { Metadata } from "next";
import { AuthFormWrapper } from "@/components/auth/auth-form-wrapper";
import { VerifyEmailForm } from "@/components/auth/forms/verify-email-form";
import { LogoutButton } from "@/components/auth/logout-button";

export const metadata: Metadata = {
  title: "Verify email",
  description: "Verify the email address on your Luma account.",
};

export default async function VerifyEmailPage() {
  // Verification tokens are request-time data and cannot be read during static prerender.
  const token = undefined;

  return (
    <AuthFormWrapper
      eyebrow="Email verification"
      title="Verify your email"
      description="Confirm your address with the link from your inbox. Verification is handled by Supabase Auth."
    >
      <div className="space-y-6">
        <VerifyEmailForm token={token} />
        <div className="border-t border-border/60 pt-4">
          <LogoutButton />
        </div>
      </div>
    </AuthFormWrapper>
  );
}
