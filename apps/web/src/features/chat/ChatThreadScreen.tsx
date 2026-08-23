"use client";
import { useEffect } from "react";
import PageShell from "@vibaar/ui/PageShell";
import Loader from "@/design-system/common/Loader";
import ChatThreadHeader from "./ChatThreadHeader";
import ChatThread from "./ChatThread";
import ChatComposer from "./ChatComposer";
import useChatStore from "@/store/chatStore";
import useAuthStore from "@/store/authStore";
import { useRouter } from "next/navigation";
import Button from "@/design-system/common/Button";

/**
 * Full thread screen shared by the buyer and seller thread routes — resolves
 * the conversation (from the store, fetching the list if deep-linked) and
 * composes the self-positioning header, message list, and footer composer.
 */
export default function ChatThreadScreen({
  conversationId,
  onBack,
}: {
  conversationId?: string;
  onBack: () => void;
}) {
  const { user } = useAuthStore();
  const router = useRouter();
  const { conversations, getConversations } = useChatStore();
  const conversation = conversations.find((c) => c.id === conversationId);

  useEffect(() => {
    // A chat thread is per-user; only a signed-in buyer/seller has conversations.
    if (user && !conversation) getConversations();
  }, [user, conversation, getConversations]);

  if (!user) {
    return (
      <PageShell
        header={
          <ChatThreadHeader
            participant={{ id: "", name: "", avatar: "", is_seller: false }}
            onBack={onBack}
          />
        }>
        <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
          <p className="text-sm font-medium text-ink-60">
            Sign in to view your messages
          </p>
          <p className="text-ink-40 text-caption mt-2 w-[80%]">
            Your conversations with sellers appear here once you sign in.
          </p>
          <div className="mt-6 w-full max-w-[220px]">
            <Button onClick={() => router.push("/signin")}>Sign in</Button>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!conversation) {
    return (
      <PageShell
        header={
          <ChatThreadHeader
            participant={{ id: "", name: "", avatar: "", is_seller: false }}
            onBack={onBack}
          />
        }>
        <Loader />
      </PageShell>
    );
  }

  return (
    <PageShell
      header={
        <ChatThreadHeader
          participant={conversation.other_participant}
          onBack={onBack}
        />
      }
      footerAction={<ChatComposer conversation={conversation} />}>
      <ChatThread conversation={conversation} />
    </PageShell>
  );
}
