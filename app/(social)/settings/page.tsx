import { requireProfile } from "@/lib/auth/dal";
import { SettingsLinkGrid } from "@/components/settings/settings-link-grid";
import { SettingsPage } from "@/components/settings/settings-page";

export default async function SettingsPageRoute() {
  await requireProfile();

  return (
    <SettingsPage
      title="Settings"
      description="Manage privacy, professional details, and account controls."
      currentPath="/settings"
    >
      <SettingsLinkGrid
        links={[
          {
            href: "/settings/privacy",
            title: "Privacy",
            description: "Account visibility, stories, messages, comments, and relationships.",
          },
          {
            href: "/settings/professional",
            title: "Professional profile",
            description: "Category, roles, headline, and self-described details.",
          },
          {
            href: "/settings/links",
            title: "Profile links",
            description: "Safe external links with visibility and ordering controls.",
          },
          {
            href: "/settings/projects",
            title: "Portfolio projects",
            description: "Projects, statuses, featured selection, and ordering.",
          },
          {
            href: "/settings/follow-requests",
            title: "Follow requests",
            description: "Incoming requests, sent requests, and current followers.",
          },
          {
            href: "/settings/notifications",
            title: "Notifications",
            description: "Activity and message-request controls that affect notifications.",
          },
        ]}
      />
    </SettingsPage>
  );
}
