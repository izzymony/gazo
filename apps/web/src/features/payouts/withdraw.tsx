"use client";

import { useState } from "react";
import useBusinessStore from "@/store/businessStore";
import { useRouter } from "next/navigation";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import Section from "@vibaar/ui/common/Section";
import Button from "@vibaar/ui/common/Button";
import BottomModal from "@vibaar/ui/common/BottomModal";
import { ChevronRight, Shield } from "@vibaar/ui/icons";
import Link from "next/link";

// KYC1 withdrawal gate: pre-check to surface the verify CTA early. The BACKEND is
// authoritative (KYC_WITHDRAWAL_GATE_NGN, default 100000) — RequestWithdrawal
// blocks regardless; this just makes the UX non-punitive instead of a raw toast.
const GATE_NGN = 100000;

export default function Withdraw({
  action,
  data,
  amount,
  setAmount,
}: {
  action: (val: string) => void;
  data: {
    accountname: string;
    accountnumber: string;
    bankname: string;
  };
  amount: string;
  setAmount: (val: string) => void;
}) {
  const { walletAnalytics, bankAccounts, singleStore } = useBusinessStore();
  const balance = walletAnalytics.available_balance;
  const hasAccount = bankAccounts && bankAccounts.length > 0 && data.accountnumber;
  const checker = balance < +amount;
  const buttonActivator = hasAccount && +amount > 0 && +amount <= balance;

  const lifetimeSales = singleStore?.lifetime_sales ?? 0;
  const verified = !!singleStore?.is_verified;
  const gated = lifetimeSales >= GATE_NGN && !verified;
  const approaching = !verified && lifetimeSales >= GATE_NGN * 0.8 && lifetimeSales < GATE_NGN;
  const [showGate, setShowGate] = useState(false);

  const router = useRouter();
  return (
    <PageShell
      header={
        <Header
          onBack={() => router.back()}
          title="Withdraw Funds"
        />
      }
      footerAction={
        <Button
          // The button's only content is a chevron, so it had no accessible
          // name at all — a screen reader announced "button" for the control
          // that commits a withdrawal (WCAG 4.1.2). The label is added rather
          // than the glyph replaced, so the visual geometry is untouched at
          // every width.
          aria-label="Continue"
          onClick={
            gated
              ? () => setShowGate(true)
              : buttonActivator
              ? () => action("confirm")
              : () => {}
          }
          className={gated || buttonActivator ? "" : "opacity-50"}>
          <ChevronRight size={20} className="text-white" aria-hidden="true" />
        </Button>
      }>
      <Section>
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <p className="text-foreground-primary font-bold text-body">To :</p>
            {hasAccount ? (
              <div>
                <p className="text-foreground-primary font-bold text-body">
                  {data.bankname.slice(0, 3) || "ACC"}-Ending in {"  "}
                  {data.accountnumber.slice(-4)}
                </p>
                <p className="text-foreground-secondary text-body font-normal">
                  {data.accountname || "Account Name"}
                </p>
              </div>
            ) : (
              <Link href={"/dashboard/payouts/addaccount"} className="cursor-pointer">
                <p className="text-brandDeep font-medium text-body">
                  + Add bank account
                </p>
                <p className="text-foreground-secondary text-body-sm font-normal">
                  Add a bank account to withdraw
                </p>
              </Link>
            )}
          </div>
          {hasAccount && (
            <button type="button"
              onClick={() => action("selectaccount")}
              className="text-left text-brandDeep text-body font-medium">
              Change
            </button>
          )}
        </div>
      </Section>

      {gated && (
        <Section>
          <div className="rounded-card border border-brandDeep/30 bg-brand/5 p-3">
            <p className="text-body-sm font-medium text-foreground-primary">
              Verify your identity to withdraw
            </p>
            <p className="text-caption text-foreground-secondary">
              You&apos;ve earned over ₦{GATE_NGN.toLocaleString()}.{" "}
              <button type="button"
                className="text-left cursor-pointer font-medium text-brandDeep"
                onClick={() => router.push("/verify")}>
                Verify now
              </button>
            </p>
          </div>
        </Section>
      )}

      {approaching && (
        <Section>
          <div className="rounded-card border border-warning-border bg-warning-surface p-3">
            <p className="text-body-sm text-foreground-primary">
              You&apos;re close to ₦{GATE_NGN.toLocaleString()} in sales —{" "}
              <button type="button"
                className="text-left cursor-pointer font-medium text-brandDeep"
                onClick={() => router.push("/verify")}>
                verify now
              </button>{" "}
              so withdrawals aren&apos;t held.
            </p>
          </div>
        </Section>
      )}

      <div className="flex-1 flex flex-col gap-2 justify-center items-center py-10">
        <input
          type="text"
          name=""
          id=""
          className="bg-transparent outline-none px-5 text-h1 py-2 text-center"
          placeholder="NGN 0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {checker && (
          <p className="text-brandDeep font-normal text-body w-[300px] text-center">
            Amount entered is more than available balance
          </p>
        )}
      </div>

      <Section>
        <p className="text-body font-bold text-foreground-secondary">
          Available balance :{" "}
          <span
            className={
              checker ? "text-brandDeep inline-flex" : "text-success-foreground inline-flex"
            }>
            N {balance}
          </span>
        </p>
      </Section>

      <BottomModal isOpen={showGate} onClose={() => setShowGate(false)}>
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
            <Shield size={32} className="text-brandDeep" />
          </span>
          <h2 className="text-body-lg font-medium text-foreground-primary">Verify to withdraw</h2>
          <p className="max-w-[280px] text-body-sm text-foreground-secondary">
            You&apos;ve earned over ₦{GATE_NGN.toLocaleString()} — verify your
            identity to unlock withdrawals. It takes about 2 minutes.
          </p>
          <Button onClick={() => router.push("/verify")} className="w-full">
            Verify now
          </Button>
          <button
            onClick={() => setShowGate(false)}
            className="text-body-sm font-medium text-foreground-secondary">
            Later
          </button>
        </div>
      </BottomModal>
    </PageShell>
  );
}
