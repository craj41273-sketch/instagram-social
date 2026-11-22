import type { Metadata } from "next";
import { InfoPage } from "@/components/layout/info-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Luma plans to handle personal information.",
};

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Placeholder policy"
      title="Privacy"
      description="Luma uses Supabase Auth for accounts and Neon PostgreSQL for application data. This page is a placeholder and will be replaced with a complete policy before launch."
      sections={[
        {
          heading: "Current state",
          body: "Accounts and sessions are handled by Supabase Auth; application profile records are stored in Neon PostgreSQL. Uploads, analytics, and social features are not part of this preview.",
        },
        {
          heading: "Planned handling",
          body: "A full policy will describe retention, deletion, and your choices before social features, uploads, or analytics are introduced.",
        },
        {
          heading: "Questions",
          body: "Contact details will be published here once the project has a support channel.",
        },
      ]}
    />
  );
}
