import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { InboxView } from "@/components/messaging/inbox-view";
import { ErrorState } from "@/components/shared/error-state";
import { PremiumButton } from "@/components/ui/premium-button";
import { requireProfile } from "@/lib/auth/dal";
import { listInbox } from "@/lib/db/messaging";
import { logServerError } from "@/lib/logging";
import { INBOX_PAGE_SIZE } from "@/lib/messaging/constants";
import { inboxPageQuerySchema } from "@/lib/validations/messaging";

export const metadata: Metadata = {
  title: "Messages",
  description: "One-to-one conversations with people on Luma.",
};

interface MessagesPageProps {
  searchParams: Promise<{ cursor?: string; limit?: string }>;
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const current = await requireProfile();
  const parsed = inboxPageQuerySchema.safeParse(await searchParams);
  const query = parsed.success ? parsed.data : { limit: INBOX_PAGE_SIZE };

  let page;
  let failed = false;
  try {
    page = await listInbox(current.user.id, query);
  } catch (error) {
    logServerError("messages.inbox.load", error);
    failed = true;
  }

  return (
    <PageContainer className="max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-primary">Inbox</p>
          <h1 className="font-heading text-2xl tracking-tight sm:text-3xl">Messages</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Private, one-to-one conversations stored on Luma.
          </p>
        </div>
        <PremiumButton premiumVariant="outline" asChild>
          <Link href="/search">
            <Search className="size-4" aria-hidden="true" />
            Find people
          </Link>
        </PremiumButton>
      </div>

      {failed || !page ? (
        <ErrorState
          title="Messages could not load"
          description="Your inbox is temporarily unavailable. Please try again in a moment."
        />
      ) : (
        <InboxView initialPage={page} limit={query.limit} />
      )}
    </PageContainer>
  );
}
