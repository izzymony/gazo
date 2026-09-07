"use client";

import { useRouter } from "next/navigation";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import Section from "@vibaar/ui/common/Section";
import Surface from "@vibaar/ui/common/Surface";
import { ChevronRight, Bank, LockPassword } from "@vibaar/ui/icons";

export default function Page() {
  const router = useRouter();
  return (
    <PageShell
      header={
        <Header
          onBack={() => router.back()}
          title="Wallet Settings"
        />
      }>
      <Section>
        <Surface
          onClick={() => router.push("/dashboard/payouts")}
          className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bank size={20} className="text-foreground-primary" />
            <p className="text-foreground-secondary text-body font-normal">
              Manage Payout Accounts
            </p>
          </div>
          <ChevronRight className="text-foreground-muted" />
        </Surface>

        <Surface
          onClick={() => {}}
          className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <LockPassword size={20} className="text-foreground-primary" />
            <p className="text-foreground-secondary text-body font-normal">
              2 Factor Authentication
            </p>
          </div>
          <ChevronRight className="text-foreground-muted" />
        </Surface>
      </Section>
    </PageShell>
  );
}
