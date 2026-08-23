"use client";
import { useParams, useRouter } from "next/navigation";
import ChatThreadScreen from "@/features/chat/ChatThreadScreen";

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const conversationId = Array.isArray(params.conversationId)
    ? params.conversationId[0]
    : params.conversationId;

  return (
    <ChatThreadScreen
      conversationId={conversationId}
      onBack={() => router.back()}
    />
  );
}
