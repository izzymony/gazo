import { create } from "zustand";
import { Client } from "@/lib/client";
import { handleAxiosError } from "@/lib/utils";

/** The other person in a conversation — a store (seller) or a user (buyer). */
export interface ChatParticipant {
  id: string;
  name: string;
  avatar: string;
  is_seller: boolean;
}

/** Product context a conversation was started from (optional). */
export interface ChatOrderItem {
  id: string;
  title: string;
  image: string;
  variant: string;
}

/** Hydrated conversation row for the inbox list (see backend ConversationDTO). */
export interface Conversation {
  id: string;
  other_participant: ChatParticipant;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  order_item?: ChatOrderItem | null;
}

export interface ChatMessage {
  id: string;
  created_at: string;
  updated_at: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
}

export interface SendMessagePayload {
  receiver_id: string;
  content: string;
  order_item_id?: string;
}

/** Backend array endpoints return `{ message, data: [...] }`; some paginated
 *  ones nest one deeper. Pull the array out robustly either way. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractArray<T>(body: any): T[] {
  if (Array.isArray(body?.data)) return body.data as T[];
  if (Array.isArray(body?.data?.data)) return body.data.data as T[];
  return [];
}

interface ChatState {
  conversations: Conversation[];
  messages: ChatMessage[];
  unreadCount: number;
  loadingConversations: boolean;
  loadingMessages: boolean;
  sending: boolean;

  getConversations: () => Promise<void>;
  getMessages: (conversationId: string) => Promise<void>;
  sendMessage: (payload: SendMessagePayload) => Promise<ChatMessage | null>;
  markRead: (conversationId: string) => Promise<void>;
  getUnreadCount: () => Promise<void>;
  clearMessages: () => void;
}

const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messages: [],
  unreadCount: 0,
  loadingConversations: false,
  loadingMessages: false,
  sending: false,

  getConversations: async () => {
    set({ loadingConversations: true });
    try {
      const res = await Client({
        path: "/chat/get-user-conversations",
        method: "GET",
      });
      set({ conversations: extractArray<Conversation>(res.data) });
    } catch (error) {
      handleAxiosError(error);
    } finally {
      set({ loadingConversations: false });
    }
  },

  getMessages: async (conversationId) => {
    set({ loadingMessages: true });
    try {
      const res = await Client({
        path: `/chat/get-conversation-messages/${conversationId}`,
        method: "GET",
      });
      set({ messages: extractArray<ChatMessage>(res.data) });
    } catch (error) {
      handleAxiosError(error);
    } finally {
      set({ loadingMessages: false });
    }
  },

  sendMessage: async (payload) => {
    set({ sending: true });
    try {
      const res = await Client<{ data?: ChatMessage }>({
        path: "/chat/send-message",
        method: "POST",
        data: payload,
      });
      const msg = res.data?.data ?? null;
      if (msg) set({ messages: [...get().messages, msg] });
      return msg;
    } catch (error) {
      handleAxiosError(error);
      return null;
    } finally {
      set({ sending: false });
    }
  },

  markRead: async (conversationId) => {
    try {
      await Client({
        path: `/chat/mark-message-read/${conversationId}`,
        method: "PATCH",
      });
      // Reflect locally so the badge/dots update without a refetch.
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, unread_count: 0 } : c
        ),
      }));
      get().getUnreadCount();
    } catch (error) {
      handleAxiosError(error);
    }
  },

  getUnreadCount: async () => {
    try {
      const res = await Client<{ unread_count?: number }>({
        path: "/chat/unread-count",
        method: "GET",
      });
      set({ unreadCount: res.data?.unread_count ?? 0 });
    } catch (error) {
      handleAxiosError(error);
    }
  },

  clearMessages: () => set({ messages: [] }),
}));

export default useChatStore;
