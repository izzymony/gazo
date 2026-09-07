"use client";
import { useRouter } from "next/navigation";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import ChatList from "@/features/chat/ChatList";

export default function Page() {
  const router = useRouter();
  return (
    <PageShell
      header={
        <Header
          onBack={() => router.back()}
          title="Messages"
        />
      }>
      <ChatList onSelect={(c) => router.push(`/dashboard/inbox/${c.id}`)} />
    </PageShell>
  );
}
