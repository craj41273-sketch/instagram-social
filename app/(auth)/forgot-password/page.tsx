import type { Metadata } from "next";
import { AuthFormWrapper } from "@/components/auth/auth-form-wrapper";
import { ForgotPasswordForm } from "@/components/auth/forms/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Start the Luma password recovery flow.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthFormWrapper
      eyebrow="Account recovery"
      title="Forgot your password?"
      description="Enter the email on your account. Recovery is not connected yet, so nothing will be sent."
    >
      <ForgotPasswordForm />
    </AuthFormWrapper>
  );
}
