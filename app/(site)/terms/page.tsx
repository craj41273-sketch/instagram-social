import type { Metadata } from "next";
import { InfoPage } from "@/components/layout/info-page";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of service placeholder for Luma.",
};

export default function TermsPage() {
  return (
    <InfoPage
      eyebrow="Placeholder policy"
      title="Terms of service"
      description="Luma is an early preview. These terms are a placeholder and will be replaced with complete terms before launch."
      sections={[
        {
          heading: "Current preview",
          body: "Registration and sign-in use Supabase Auth. Uploads and social features are not part of this preview; nothing you enter publishes content.",
        },
        {
          heading: "Future terms",
          body: "Final terms will cover acceptable use, content ownership, and the responsibilities of community members once those features are available.",
        },
        {
          heading: "Changes",
          body: "This page will be updated as the product adds social features.",
        },
      ]}
    />
  );
}
