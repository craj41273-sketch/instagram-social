import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/forms/login-form";
import { AuthFormWrapper } from "@/components/auth/auth-form-wrapper";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Luma account.",
};

export default function LoginPage() {
  return (
    <AuthFormWrapper
      eyebrow="Welcome back"
      title="Log in to Luma"
      description="Your photographs and people are waiting. Sign-in is prepared for a future backend block."
      footer={
        <p>
          Having trouble?{" "}
          <Link
            href="/forgot-password"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Reset your password
          </Link>
        </p>
      }
    >
      <LoginForm />
    </AuthFormWrapper>
  );
}
