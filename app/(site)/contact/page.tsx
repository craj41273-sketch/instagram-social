import type { Metadata } from "next";
import { InfoPage } from "@/components/layout/info-page";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact information for Luma.",
};

export default function ContactPage() {
  return (
    <InfoPage
      eyebrow="Get in touch"
      title="Contact"
      description="There is no support channel yet. This page exists so every footer link resolves to a real, honest destination."
      sections={[
        {
          heading: "During development",
          body: "Luma is being built in public blocks. Support and feedback details will be added here when the project is ready to receive them.",
        },
        {
          heading: "Feedback",
          body: "Until then, the design system at /design-system is the best reference for the current state of the product.",
        },
      ]}
    />
  );
}
