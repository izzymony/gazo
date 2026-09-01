"use client";
import { useEffect, useRef } from "react";
import useChatStore, { Conversation } from "@/store/chatStore";
import useAuthStore from "@/store/authStore";
import { cn, getMobileCompatibleImageUrl } from "@/lib/utils";
import Loader from "@vibaar/ui/common/Loader";

/* eslint-disable @next/next/no-img-element */
/**
 * Shared message thread — the product-context chip (if the conversation was
 * started from an order item) plus the message bubbles. Bubbles align by
 * comparing each message's sender to the logged-in user. The composer lives
 * separately (ChatComposer) so the route can mount it in PageShell.footerAction.
 */
export default function ChatThread({
  conversation,
}: {
  conversation: Conversation;
}) {
  const { messages, loadingMessages, getMessages, markRead } = useChatStore();
  const { user } = useAuthStore();
  const endRef = useRef<HTMLDivElement>(null);
  const myId = user?.id;

  useEffect(() => {
    getMessages(conversation.id);
    markRead(conversation.id);
  }, [conversation.id, getMessages, markRead]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex flex-col gap-3">
      {conversation.order_item && (
        <div className="flex items-center gap-3 p-2 bg-ink-3 rounded-field sticky top-0 z-sticky">
          <img
            src={
              conversation.order_item.image
                ? getMobileCompatibleImageUrl(conversation.order_item.image)
                : "/Product image (1).png"
            }
            alt={conversation.order_item.title}
            className="w-10 h-10 rounded-field object-cover flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="text-body-sm font-medium text-ink-90 line-clamp-1">
              {conversation.order_item.title}
            </p>
            {conversation.order_item.variant && (
              <p className="text-caption text-ink-60 line-clamp-1">
                {conversation.order_item.variant}
              </p>
            )}
          </div>
        </div>
      )}

      {loadingMessages && messages.length === 0 ? (
        <Loader />
      ) : (
        messages.map((m) => {
          const mine = m.sender_id === myId;
          return (
            <div
              key={m.id}
              className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[75%] rounded-card p-3 text-body break-words",
                  mine ? "bg-brand text-brandInk" : "bg-ink-3 text-ink-90"
                )}>
                {m.content}
              </div>
            </div>
          );
        })
      )}
      <div ref={endRef} />
    </div>
  );
}
