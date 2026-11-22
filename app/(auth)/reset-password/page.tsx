import type { Metadata } from "next";
import { AuthFormWrapper } from "@/components/auth/auth-form-wrapper";
import { ResetPasswordForm } from "@/components/auth/forms/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your Luma account.",
};

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : undefined;

  return (
    <AuthFormWrapper
      eyebrow="Account recovery"
      title="Choose a new password"
      description="Choose a new password using the link from your recovery email."
    >
      <ResetPasswordForm token={token} />
    </AuthFormWrapper>
  );
}
