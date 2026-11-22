import type { Metadata } from "next";
import { AuthFormWrapper } from "@/components/auth/auth-form-wrapper";
import { VerifyEmailForm } from "@/components/auth/forms/verify-email-form";
import { LogoutButton } from "@/components/auth/logout-button";

export const metadata: Metadata = {
  title: "Verify email",
  description: "Verify the email address on your Luma account.",
};

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : undefined;

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
