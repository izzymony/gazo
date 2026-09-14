/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import useBusinessStore from "@/store/businessStore";
import EmptyState from "@vibaar/ui/common/EmptyState";
import { useRouter } from "next/navigation";
import ResponsiveRouteDialog from "@vibaar/ui/common/ResponsiveRouteDialog";
import Section from "@vibaar/ui/common/Section";
import Button from "@vibaar/ui/common/Button";
import { Bank, ChevronRight } from "@vibaar/ui/icons";

export const BankCard = ({
  action,
  accountname,
  accountnumber,
  isDefault,
  bankname,
  id,
}: {
  action: (val: {
    accountname: string;
    accountnumber: string;
    bankname: string;
    id: string;
  }) => void;
  accountname: string;
  accountnumber: string;
  isDefault: boolean;
  bankname: string;
  id: string;
}) => (
  <button type="button"
    onClick={() =>
      action({
        accountname: accountname,
        accountnumber: accountnumber,
        bankname: bankname,
        id: id,
      })
    }
    className="text-left justify-between items-center flex gap-4 border border-outline rounded-field py-3 ps-3 pe-3">
    <div className="w-10 h-10 rounded-field bg-surface border border-outline flex items-center justify-center shrink-0">
      <Bank size={22} className="text-foreground-primary" />
    </div>
    <div className="flex-1">
      <div className="flex gap-2 items-center">
        <p className="text-body text-foreground-primary font-medium">
          {bankname.slice(0, 3) || "ACC"}-Ending in {"  "}
          {accountnumber.slice(-4)}
        </p>
        {isDefault && (
          <span className="rounded-pill bg-brand/10 text-brandDeep text-caption font-medium px-2 py-0.5">
            Default
          </span>
        )}
      </div>
      <p className="text-caption text-foreground-secondary font-normal">
        {accountname || "acc"}
      </p>
    </div>
    <ChevronRight size={20} className="text-foreground-primary shrink-0" />
  </button>
);

/**
 * Dialog family 1 — choosing which account a withdrawal lands in.
 *
 * The one family with NO route of its own: it is a state inside
 * /dashboard/payouts/withdraw, so there is nothing to intercept and nothing to
 * paste into a URL bar. It reuses `ResponsiveRouteDialog` anyway, because the
 * presentation requirement is identical — a full screen on a phone, a bounded
 * panel over the page at lg — and `onClose` is the only thing that differs: a
 * state change here, `router.back()` on the five route-backed families.
 *
 * It used to REPLACE the withdraw screen entirely, as a sibling `PageShell` in
 * the same state machine. On a phone that reads the same; on a desktop it meant
 * the amount you had just typed vanished behind a second full page to answer one
 * question. The withdraw screen now stays mounted underneath, which also means
 * the entered amount is visibly preserved rather than merely retained in state.
 */
export default function SelectAccount({
  action,
  goBack,
}: {
  action: (val: {
    accountname: string;
    accountnumber: string;
    bankname: string;
    id: string;
  }) => void;
  goBack: () => void;
}) {
  const { bankAccounts } = useBusinessStore();
  const banks = bankAccounts;
  const router = useRouter();

  return (
    <ResponsiveRouteDialog title="Select account" onClose={goBack} size="md">
      <Section>
        <p className="text-foreground-primary font-medium text-h1">
          Which account would you like to withdraw to?
        </p>
      </Section>
      <Section>
        {banks && banks.length > 0 ? (
          banks.map((bank) => (
            <BankCard
              key={bank.id}
              action={action}
              accountname={bank.account_name}
              accountnumber={bank.account_number}
              isDefault={bank.is_default}
              bankname={bank.bank}
              id={bank.id}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center">
            <EmptyState
              image="/images/emptystate/activity_empty_state.svg"
              title="No accounts added yet."
              subtitle="Any accounts added on your wallet will appear here."
            />
            <Button
              variant="ghost"
              size="sm"
              fullWidth={false}
              onClick={() => router.push("/dashboard/payouts/addaccount")}
              className="mt-4">
              <span>+</span> Add new Account
            </Button>
          </div>
        )}
      </Section>
    </ResponsiveRouteDialog>
  );
}
