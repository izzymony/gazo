"use client";
import { useEffect } from "react";
import useChatStore, { Conversation } from "@/store/chatStore";
import { cn, getMobileCompatibleImageUrl } from "@/lib/utils";
import EmptyState from "@vibaar/ui/common/EmptyState";
import Loader from "@vibaar/ui/common/Loader";
import { BubbleChat } from "@vibaar/ui/icons";
import { relativeTime } from "./relativeTime";

/* eslint-disable @next/next/no-img-element */
/**
 * Shared conversations list — used by both the buyer and seller inbox routes.
 * Data is scoped to the logged-in user by the backend, so a buyer sees their
 * chats with sellers and a seller sees their chats with buyers. Navigation is
 * left to the route via `onSelect` so each shell owns its own thread path.
 */
export default function ChatList({
  onSelect,
}: {
  onSelect: (conversation: Conversation) => void;
}) {
  const { conversations, loadingConversations, getConversations } =
    useChatStore();

  useEffect(() => {
    getConversations();
  }, [getConversations]);

  if (loadingConversations && conversations.length === 0) {
    return <Loader />;
  }

  if (!loadingConversations && conversations.length === 0) {
    return (
      <EmptyState
        icon={<BubbleChat size={34} />}
        title="No messages yet"
        subtitle="When you chat with a store about an order, it'll show up here."
      />
    );
  }

  return (
    <div className="flex flex-col">
      {conversations.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c)}
          className="w-full flex items-center gap-3 py-3 text-left active:bg-ink-3 transition-colors">
          <img
            src={
              c.other_participant.avatar
                ? getMobileCompatibleImageUrl(c.other_participant.avatar)
                : "/Product image (1).png"
            }
            alt={c.other_participant.name || "Chat"}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-ink-90 font-medium text-body line-clamp-1">
                {c.other_participant.name || "Vibaar user"}
              </p>
              <span className="text-ink-40 text-caption flex-shrink-0">
                {relativeTime(c.last_message_at)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p
                className={cn(
                  "text-body-sm line-clamp-1",
                  c.unread_count > 0
                    ? "text-ink-90 font-medium"
                    : "text-ink-60"
                )}>
                {c.last_message || "Say hello 👋"}
              </p>
              {c.unread_count > 0 && (
                <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-brand text-white text-micro font-semibold flex items-center justify-center">
                  {c.unread_count > 9 ? "9+" : c.unread_count}
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
