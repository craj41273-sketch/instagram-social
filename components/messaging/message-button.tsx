"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { postJson } from "@/lib/api/client";
import { PremiumButton } from "@/components/ui/premium-button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";

interface MessageButtonProps {
  username: string;
  isAuthenticated: boolean;
  isSelf?: boolean;
  loginHref: string;
  compact?: boolean;
}

/** Starts or reuses one conversation from any existing profile entry point. */
export function MessageButton({
  username,
  isAuthenticated,
  isSelf = false,
  loginHref,
  compact = false,
}: MessageButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  if (isSelf) return null;

  if (!isAuthenticated) {
    return (
      <PremiumButton premiumVariant="outline" size={compact ? "sm" : "lg"} asChild>
        <Link href={loginHref}>
          <MessageCircle className="size-4" aria-hidden="true" />
          Message
        </Link>
      </PremiumButton>
    );
  }

  async function startConversation() {
    if (pending) return;
    setPending(true);
    try {
      const result = await postJson<{ conversationId: string }>("/api/conversations", {
        username,
      });
      router.push(`/messages/${result.conversationId}`);
    } catch (error) {
      toast({
        title: "Could not open a conversation",
        description: error instanceof Error ? error.message : "Please try again.",
        tone: "error",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <PremiumButton
      type="button"
      premiumVariant="outline"
      size={compact ? "sm" : "lg"}
      onClick={startConversation}
      disabled={pending}
      aria-label={`Message ${username}`}
    >
      {pending ? (
        <Spinner className="size-4" />
      ) : (
        <MessageCircle className="size-4" aria-hidden="true" />
      )}
      Message
    </PremiumButton>
  );
}
