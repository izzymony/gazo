"use client";
import { useRouter } from "next/navigation";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@/design-system/common/Header";
import ChatList from "@/features/chat/ChatList";

export default function Page() {
  const router = useRouter();
  return (
    <PageShell
      header={
        <Header
          showBack
          customText="Messages"
          onBackClick={() => router.back()}
        />
      }>
      <ChatList onSelect={(c) => router.push(`/dashboard/inbox/${c.id}`)} />
    </PageShell>
  );
}
