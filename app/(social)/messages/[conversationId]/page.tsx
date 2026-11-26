import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { ConversationView } from "@/components/messaging/conversation-view";
import { ErrorState } from "@/components/shared/error-state";
import { PremiumButton } from "@/components/ui/premium-button";
import { requireProfile } from "@/lib/auth/dal";
import { parseUserId } from "@/lib/db/profile-sql";
import {
  getConversationHeader,
  listMessages,
} from "@/lib/db/messaging";
import { logServerError } from "@/lib/logging";
import { messagePageQuerySchema } from "@/lib/validations/messaging";

export const metadata: Metadata = {
  title: "Conversation",
  description: "A private one-to-one conversation on Luma.",
};

interface ConversationPageProps {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ cursor?: string; limit?: string }>;
}

export default async function ConversationPage({
  params,
  searchParams,
}: ConversationPageProps) {
  const current = await requireProfile();
  const rawId = (await params).conversationId;
  const conversationId = parseUserId(rawId);
  if (!conversationId) notFound();

  const parsed = messagePageQuerySchema.safeParse(await searchParams);
  const query = parsed.success ? parsed.data : { limit: 20 };

  let header;
  let page;
  try {
    header = await getConversationHeader(conversationId, current.user.id);
    if (!header) notFound();
    page = await listMessages(conversationId, current.user.id, query);
  } catch (error) {
    logServerError("messages.conversation.load", error, { conversationId });
    return (
      <PageContainer className="max-w-3xl">
        <ErrorState
          title="Conversation could not load"
          description="This conversation is temporarily unavailable. Please try again in a moment."
          action={
            <PremiumButton premiumVariant="outline" asChild>
              <Link href="/messages">Back to messages</Link>
            </PremiumButton>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="max-w-3xl space-y-5">
      <ConversationView
        conversationId={conversationId}
        viewerId={current.user.id}
        header={header}
        initialPage={page}
      />
    </PageContainer>
  );
}
