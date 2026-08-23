"use client";

import { useState } from "react";
import useBusinessStore from "@/store/businessStore";
import { useRouter } from "next/navigation";
import PageShell from "@/design-system/PageShell";
import Header from "@/design-system/common/Header";
import Section from "@/design-system/common/Section";
import Button from "@/design-system/common/Button";
import BottomModal from "@/design-system/common/BottomModal";
import { ChevronRight, Shield } from "@/design-system/icons";

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
          showBack
          onBackClick={() => router.back()}
          customText="Withdraw Funds"
        />
      }
      footerAction={
        <Button
          onClick={
            gated
              ? () => setShowGate(true)
              : buttonActivator
              ? () => action("confirm")
              : () => {}
          }
          className={gated || buttonActivator ? "" : "opacity-50"}>
          <ChevronRight size={20} className="text-white" />
        </Button>
      }>
      <Section>
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <p className="text-ink-90 font-bold text-body">To :</p>
            {hasAccount ? (
              <div>
                <p className="text-ink-90 font-bold text-body">
                  {data.bankname.slice(0, 3) || "ACC"}-Ending in {"  "}
                  {data.accountnumber.slice(-4)}
                </p>
                <p className="text-ink-60 text-body font-normal">
                  {data.accountname || "Account Name"}
                </p>
              </div>
            ) : (
              <div
                onClick={() => router.push("/dashboard/payouts/addaccount")}
                className="cursor-pointer">
                <p className="text-instaRed font-medium text-body">
                  + Add bank account
                </p>
                <p className="text-ink-60 text-body-sm font-normal">
                  Add a bank account to withdraw
                </p>
              </div>
            )}
          </div>
          {hasAccount && (
            <p
              onClick={() => action("selectaccount")}
              className="text-instaRed text-body font-medium">
              Change
            </p>
          )}
        </div>
      </Section>

      {gated && (
        <Section>
          <div className="rounded-card border border-instaRed/30 bg-instaRed/5 p-3">
            <p className="text-body-sm font-medium text-ink-90">
              Verify your identity to withdraw
            </p>
            <p className="text-caption text-ink-60">
              You&apos;ve earned over ₦{GATE_NGN.toLocaleString()}.{" "}
              <span
                className="cursor-pointer font-medium text-instaRed"
                onClick={() => router.push("/verify")}>
                Verify now
              </span>
            </p>
          </div>
        </Section>
      )}

      {approaching && (
        <Section>
          <div className="rounded-card border border-warning/30 bg-warning/10 p-3">
            <p className="text-body-sm text-ink-90">
              You&apos;re close to ₦{GATE_NGN.toLocaleString()} in sales —{" "}
              <span
                className="cursor-pointer font-medium text-instaRed"
                onClick={() => router.push("/verify")}>
                verify now
              </span>{" "}
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
          <p className="text-instaRed font-normal text-body w-[300px] text-center">
            Amount entered is more than available balance
          </p>
        )}
      </div>

      <Section>
        <p className="text-body font-bold text-ink-60">
          Available balance :{" "}
          <span
            className={
              checker ? "text-instaRed inline-flex" : "text-green inline-flex"
            }>
            N {balance}
          </span>
        </p>
      </Section>

      <BottomModal isOpen={showGate} onClose={() => setShowGate(false)}>
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-instaRed/10">
            <Shield size={32} className="text-instaRed" />
          </span>
          <h2 className="text-body-lg font-medium text-ink-90">Verify to withdraw</h2>
          <p className="max-w-[280px] text-body-sm text-ink-60">
            You&apos;ve earned over ₦{GATE_NGN.toLocaleString()} — verify your
            identity to unlock withdrawals. It takes about 2 minutes.
          </p>
          <Button onClick={() => router.push("/verify")} className="w-full">
            Verify now
          </Button>
          <button
            onClick={() => setShowGate(false)}
            className="text-body-sm font-medium text-ink-60">
            Later
          </button>
        </div>
      </BottomModal>
    </PageShell>
  );
}
