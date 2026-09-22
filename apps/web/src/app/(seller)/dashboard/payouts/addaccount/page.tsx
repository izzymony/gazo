/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Authenthecate from "@/features/auth/authenthecate";
import { useRouter } from "next/navigation";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import Section from "@vibaar/ui/common/Section";
import Button from "@vibaar/ui/common/Button";
import {
  AddPayoutAccountFields,
  useAddPayoutAccount,
} from "@/features/payouts/addPayoutAccount";

/**
 * The canonical add-payout-account screen, and the direct-URL / hard-refresh
 * fallback for the dialog the payouts page intercepts to. Its two steps, its
 * state and its create call all come from the shared machine, so the page and
 * the dialog cannot answer differently.
 */
export default function Page() {
  const router = useRouter();
  const m = useAddPayoutAccount();

  return m.otp ? (
    <Authenthecate
      action={() => {}}
      base={false}
      backAction={() => m.setOtp(false)}
      buttonAction={m.createBanks}
      phone={m.phone}
      buttonClicked={function (): Promise<void> {
        throw new Error("Function not implemented.");
      }}
    />
  ) : (
    <PageShell
      header={
        <Header
          onBack={() => router.back()}
          title="Add Payout Accounts"
        />
      }
      footerAction={<Button onClick={() => m.setOtp(true)}>Save</Button>}>
      <Section>
        <AddPayoutAccountFields machine={m} />
      </Section>
    </PageShell>
  );
}
