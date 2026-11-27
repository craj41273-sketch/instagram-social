import { requireProfile } from "@/lib/auth/dal";
import { SettingsLinkGrid } from "@/components/settings/settings-link-grid";
import { SettingsPage } from "@/components/settings/settings-page";

export default async function PrivacyOverviewPage() {
  await requireProfile();

  return (
    <SettingsPage
      title="Privacy overview"
      description="Choose where each part of your account is visible and who can interact."
      currentPath="/settings/privacy"
    >
      <SettingsLinkGrid
        links={[
          {
            href: "/settings/privacy/account",
            title: "Account",
            description: "Private account, discovery, contact visibility, and counts.",
          },
          {
            href: "/settings/privacy/stories",
            title: "Stories",
            description: "Audience, replies, and reactions for your stories.",
          },
          {
            href: "/settings/privacy/messages",
            title: "Messages",
            description: "Who can message you and how requests work.",
          },
          {
            href: "/settings/privacy/comments",
            title: "Comments",
            description: "Who can comment and whether comments are enabled.",
          },
          {
            href: "/settings/privacy/tags-and-mentions",
            title: "Tags and mentions",
            description: "Mention permissions and manual tag approval.",
          },
          {
            href: "/settings/privacy/hidden-words",
            title: "Hidden words",
            description: "Words and phrases filtered from what you see.",
          },
          {
            href: "/settings/privacy/blocked",
            title: "Blocked accounts",
            description: "Accounts you have blocked.",
          },
          {
            href: "/settings/privacy/restricted",
            title: "Restricted accounts",
            description: "Accounts with limited interactions.",
          },
          {
            href: "/settings/privacy/muted",
            title: "Muted accounts",
            description: "Accounts whose updates you have muted.",
          },
          {
            href: "/settings/follow-requests",
            title: "Follow requests",
            description: "Review, cancel, and manage follow relationships.",
          },
          {
            href: "/settings/notifications",
            title: "Notifications",
            description: "Activity status and message-request signals.",
          },
        ]}
      />
    </SettingsPage>
  );
}
