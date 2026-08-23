"use client";
import { useState } from "react";
import useChatStore, { Conversation } from "@/store/chatStore";
import { Add, Send } from "@vibaar/ui/icons";

/**
 * Message input bar — mounted in PageShell.footerAction by the thread routes.
 * Sends via receiver_id + the conversation's order_item; the store appends the
 * new message optimistically on success.
 */
export default function ChatComposer({
  conversation,
}: {
  conversation: Conversation;
}) {
  const { sendMessage, sending } = useChatStore();
  const [draft, setDraft] = useState("");

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setDraft("");
    await sendMessage({
      receiver_id: conversation.other_participant.id,
      content,
      order_item_id: conversation.order_item?.id,
    });
  };

  return (
    <div className="flex items-center gap-2 rounded-pill p-2 bg-ink-3">
      <button
        type="button"
        aria-label="Add attachment"
        className="text-ink-90 flex-shrink-0">
        <Add size={22} />
      </button>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSend();
        }}
        placeholder="Type a message"
        className="flex-1 h-6 border-0 bg-transparent text-body-sm text-ink-90 placeholder:text-ink-40 focus:outline-none"
      />
      <button
        type="button"
        aria-label="Send"
        onClick={handleSend}
        disabled={sending || !draft.trim()}
        className="text-brand flex-shrink-0 disabled:opacity-40">
        <Send size={22} />
      </button>
    </div>
  );
}
