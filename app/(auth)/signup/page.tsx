import type { Metadata } from "next";
import Link from "next/link";
import { AuthFormWrapper } from "@/components/auth/auth-form-wrapper";
import { SignupForm } from "@/components/auth/forms/signup-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your Luma account.",
};

export default function SignupPage() {
  return (
    <AuthFormWrapper
      eyebrow="Join Luma"
      title="Create your account"
      description="A quieter, more considered place for the photographs you love."
      footer={
        <p>
          By continuing you agree to our{" "}
          <Link
            href="/terms"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      }
    >
      <SignupForm />
    </AuthFormWrapper>
  );
}
