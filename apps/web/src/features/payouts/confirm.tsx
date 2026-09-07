/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import useBusinessStore from "@/store/businessStore";
import useProductStore from "@/store/productStore";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import Section from "@vibaar/ui/common/Section";
import Button from "@vibaar/ui/common/Button";

export const ReceiptCard = ({
  title,
  content,
  sub,
}: {
  title: string;
  content?: string;
  sub: string;
}) => {
  return (
    <div className="flex justify-between gap-2 py-4">
      <div>
        <p className="text-body font-normal text-foreground-primary">{title}</p>
      </div>
      <div className="items-end flex flex-col">
        {content && (
          <p className="text-body font-medium text-foreground-primary">{content}</p>
        )}
        {sub.toLowerCase() === "pending" ? (
          <div className="px-2 py-1 bg-warning-surface rounded-pill border border-warning-border">
            <p className="text-body-sm font-normal text-warning-foreground">Pending</p>
          </div>
        ) : sub.toLowerCase() === "completed" ? (
          <div className="px-2 py-1 bg-success-surface rounded-pill border border-success-border">
            <p className="text-body-sm font-normal text-success-foreground">Completed</p>
          </div>
        ) : (
          <p className="text-body font-normal text-foreground-secondary">{sub}</p>
        )}
      </div>
    </div>
  );
};

export default function Confirm({
  action,
  goBack,
  data,
  amount,
}: {
  action: (val: string) => void;
  goBack: () => void;
  data: {
    accountname: string;
    accountnumber: string;
    bankname: string;
  };
  amount: string;
}) {
  // No withdrawal fee is charged — the backend deducts exactly the amount
  // (walletService.RequestWithdrawal). Shown as ₦0.00 for transparency rather
  // than the previous hardcoded ₦100, which was never actually charged.
  const withdrawalfee = 0;
  const total = +amount + withdrawalfee;
  const {fetchWithdrawOtp } = useProductStore()

  const handleConfirm = async () => {
    try {
      await fetchWithdrawOtp().then((res) => action("authenthecate"));
      // await getOtp("+2347025841974").then((res: any) => {
      //   //(res);
      //   action("authenthecate");
      // });
    } catch (error) {
      //(error);
    }
  };
  return (
    <PageShell
      header={
        <Header
          onBack={goBack}
          title="Confirm Withdraw"
        />
      }
      footerAction={<Button onClick={handleConfirm}>Confirm</Button>}>
      <Section>
        <div className="flex items-center justify-center mt-5">
          <p className="text-foreground-primary font-medium text-h2">NGN {amount}</p>
        </div>
      </Section>
      <Section>
        <ReceiptCard
          title={"To:"}
          sub={data.accountname}
          content={` ${
            data.bankname.slice(0, 3) || "ACC"
          }-Ending in ${data.accountnumber.slice(-4)}`}
        />
        <ReceiptCard title={"Withdrawal Amount"} sub={"NGN " + amount} />
        <ReceiptCard title={"Withdrawal Fee"} sub={"NGN " + withdrawalfee.toFixed(2)} />
        <ReceiptCard title={"Total"} sub={"NGN " + total} />
      </Section>
      <Section>
        <p className="mx-11 text-body-sm text-center font-normal text-foreground-secondary">
          Bank Transfers typically works instantly! In rare cases, processing
          may take longer depending on your bank.
        </p>
      </Section>
    </PageShell>
  );
}
