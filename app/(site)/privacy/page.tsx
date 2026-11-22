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
      description="Luma does not collect account data in this frontend preview. This page is a placeholder and will be replaced with a complete policy before launch."
      sections={[
        {
          heading: "Current state",
          body: "No accounts, sessions, uploads, or analytics are active. Form data entered in this preview stays in your browser and is not transmitted.",
        },
        {
          heading: "Planned handling",
          body: "Account details will be stored with Supabase Auth, and application data with Neon PostgreSQL. A full policy will describe retention, deletion, and your choices before any of these services are enabled.",
        },
        {
          heading: "Questions",
          body: "Contact details will be published here once the project has a support channel.",
        },
      ]}
    />
  );
}
