import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/forms/login-form";
import { AuthFormWrapper } from "@/components/auth/auth-form-wrapper";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Luma account.",
};

export default async function LoginPage() {
  // Query strings are request-time data and cannot be read during static prerender.
  const notice = null;

  return (
    <AuthFormWrapper
      eyebrow="Welcome back"
      title="Log in to Luma"
      description="Your photographs and people are waiting. Sign in with your Luma account."
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
      <LoginForm notice={notice} />
    </AuthFormWrapper>
  );
}
