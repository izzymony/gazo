/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import useBusinessStore from "@/store/businessStore";
import { useRouter } from "next/navigation";
import TransactionIcon from "@vibaar/ui/common/TransactionIcon";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import Section from "@vibaar/ui/common/Section";
import Button from "@vibaar/ui/common/Button";
import DetailRow from "@vibaar/ui/common/DetailRow";
import DetailList from "@vibaar/ui/common/DetailList";
import StatusBadge from "@/features/orders/StatusBadge";

export default function WithdrawalDetails({
  action = () => {},
  base = true,
  balanceAfter = "",
  data,
}: {
  action: (val: string) => void;
  base?: boolean;
  balanceAfter?: string;
  data?: {
    amount: string;
    created_at: string;
    reference: string;
    status: string;
    bankname: string;
    accountnumber: string;
    accountname: string;
  };
}) {
  const { selectedTransaction } = useBusinessStore();
  const router = useRouter();
  const datas = data || {
    amount: "0",
    created_at: "",
    reference: "",
    status: "",
    bankname: "",
    accountnumber: "",
    accountname: "",
  };
  const handleClick = () => {
    action("");
  };
  return (
    <PageShell
      header={
        <Header
          onBack={base
              ? () => router.push("/dashboard")
              : () => router.push("/dashboard")}
          title="Transaction details"
        />
      }
      footerAction={
        selectedTransaction.icon === "refund" ? (
          <Button onClick={handleClick}>Continue</Button>
        ) : undefined
      }>
      <Section className="flex flex-col gap-2 items-center">
        <div className="flex justify-center items-center">
          <TransactionIcon
            icon={selectedTransaction.icon}
            type={selectedTransaction.type}
            size="lg"
          />
        </div>
        <div className="flex justify-center items-center flex-col gap-2">
          <p className="text-h1 font-medium text-foreground-primary text-center">
            {selectedTransaction.amount || "-₦ " + datas.amount}
          </p>
          <p className="text-body-sm w-3/4 font-normal text-foreground-secondary text-center">
            {selectedTransaction.title ||
              "We are working on your transfer! Your money should enter your account shortly."}
          </p>
        </div>
      </Section>

      <Section className="w-full space-y-4">
        <DetailList title="Transaction">
          <DetailRow label="Transaction Type" value={"Withdrawal"} />
          <DetailRow label="Transaction Amount" value={"₦ " + datas.amount} />
          <DetailRow label="Beneficiary">
            <div className="flex flex-col items-end text-right">
              <p className="text-body font-medium text-foreground-primary">{`${datas.bankname.slice(
                0,
                3
              )} - Ending in ${datas.accountnumber.slice(-4)}`}</p>
              <p className="text-body-sm text-foreground-secondary">{datas.accountname}</p>
            </div>
          </DetailRow>
          <DetailRow label="Transaction Status">
            {datas.status ? (
              <StatusBadge status={datas.status} />
            ) : (
              <p className="text-body font-medium text-foreground-primary text-right">
                {datas.status}
              </p>
            )}
          </DetailRow>
        </DetailList>

        <DetailList title="Details">
          <DetailRow label="Time and Date" value={"12:30, Aug 13 2025"} />
          <DetailRow label="Transaction ID" value={datas.reference} />
          <DetailRow
            label="Balance After Transaction"
            value={balanceAfter}
          />
        </DetailList>
      </Section>
    </PageShell>
  );
}
