"use client";

import { useRouter } from "next/navigation";
import PageShell from "@/design-system/PageShell";
import Header from "@/design-system/common/Header";
import Section from "@/design-system/common/Section";
import Card from "@/design-system/common/Card";
import { ChevronRight, Bank, LockPassword } from "@/design-system/icons";

export default function Page() {
  const router = useRouter();
  return (
    <PageShell
      header={
        <Header
          showBack
          onBackClick={() => router.back()}
          customText="Wallet Settings"
        />
      }>
      <Section>
        <Card
          onClick={() => router.push("/dashboard/payouts")}
          className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bank size={20} className="text-ink-90" />
            <p className="text-ink-60 text-body font-normal">
              Manage Payout Accounts
            </p>
          </div>
          <ChevronRight className="text-ink-40" />
        </Card>

        <Card
          onClick={() => {}}
          className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <LockPassword size={20} className="text-ink-90" />
            <p className="text-ink-60 text-body font-normal">
              2 Factor Authentication
            </p>
          </div>
          <ChevronRight className="text-ink-40" />
        </Card>
      </Section>
    </PageShell>
  );
}
