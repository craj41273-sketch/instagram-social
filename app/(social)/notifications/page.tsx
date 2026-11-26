import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { ErrorState } from "@/components/shared/error-state";
import { PremiumButton } from "@/components/ui/premium-button";
import { requireProfile } from "@/lib/auth/dal";
import { listNotifications } from "@/lib/db/notifications";
import { logServerError } from "@/lib/logging";
import { NOTIFICATION_PAGE_SIZE } from "@/lib/messaging/constants";
import { notificationPageQuerySchema } from "@/lib/validations/notifications";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Real activity from people you follow and conversations you share.",
};

interface NotificationsPageProps {
  searchParams: Promise<{ cursor?: string; limit?: string }>;
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const current = await requireProfile();
  const parsed = notificationPageQuerySchema.safeParse(await searchParams);
  const query = parsed.success ? parsed.data : { limit: NOTIFICATION_PAGE_SIZE };

  let page;
  let failed = false;
  try {
    page = await listNotifications(current.user.id, query);
  } catch (error) {
    logServerError("notifications.page.load", error);
    failed = true;
  }

  return (
    <PageContainer className="max-w-3xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-primary">Activity</p>
        <h1 className="font-heading text-2xl tracking-tight sm:text-3xl">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Follows, likes, comments, story reactions, and messages from Luma.
        </p>
      </div>

      {failed || !page ? (
        <ErrorState
          title="Notifications could not load"
          description="Your activity is temporarily unavailable. Please try again in a moment."
          action={
            <PremiumButton premiumVariant="outline" asChild>
              <Link href="/posts">Back to feed</Link>
            </PremiumButton>
          }
        />
      ) : (
        <NotificationCenter initialPage={page} limit={query.limit} />
      )}
    </PageContainer>
  );
}
