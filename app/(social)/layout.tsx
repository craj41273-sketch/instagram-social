import type { ReactNode } from "react";
import Link from "next/link";
import { Brand } from "@/components/shared/brand";
import { PageContainer } from "@/components/layout/page-container";
import { SocialNav } from "@/components/messaging/social-nav";
import { getApiProfile } from "@/lib/api/identity";
import { getUnreadCounts } from "@/lib/db/messaging";
import { logServerError } from "@/lib/logging";
import type { UnreadCounts } from "@/lib/messaging/types";

/** Responsive shell for profiles, posts, explore, search, and messages. */
export default async function SocialLayout({ children }: { children: ReactNode }) {
  const current = await getApiProfile("social.layout.identity");
  let unread: UnreadCounts = { messages: 0, notifications: 0 };
  if (current) {
    try {
      unread = await getUnreadCounts(current.user.id);
    } catch (error) {
      logServerError("social.layout.unread", error);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <PageContainer className="flex flex-col items-start gap-1 py-2 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:py-0">
          <Link
            href="/"
            className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
            aria-label="Luma home"
          >
            <Brand />
          </Link>
          <SocialNav userId={current?.user.id ?? null} initialCounts={unread} />
        </PageContainer>
      </header>
      <main className="flex-1 py-8 sm:py-10">{children}</main>
    </>
  );
}
