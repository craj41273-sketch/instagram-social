import type { Metadata } from "next";
import { AuthFormWrapper } from "@/components/auth/auth-form-wrapper";
import { VerifyEmailForm } from "@/components/auth/forms/verify-email-form";

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
      description="We are ready to confirm your address once Supabase Auth is connected. No verification is simulated here."
    >
      <VerifyEmailForm token={token} />
    </AuthFormWrapper>
  );
}
