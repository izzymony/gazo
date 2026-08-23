/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import useBusinessStore from "@/store/businessStore";
import useProductStore from "@/store/productStore";
import PageShell from "@/design-system/PageShell";
import Header from "@/design-system/common/Header";
import Section from "@/design-system/common/Section";
import Button from "@/design-system/common/Button";

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
        <p className="text-body font-normal text-ink-90">{title}</p>
      </div>
      <div className="items-end flex flex-col">
        {content && (
          <p className="text-body font-medium text-ink-90">{content}</p>
        )}
        {sub.toLowerCase() === "pending" ? (
          <div className="px-2 py-1 bg-warning/10 rounded-pill border border-warning/30">
            <p className="text-body-sm font-normal text-warning-strong">Pending</p>
          </div>
        ) : sub.toLowerCase() === "completed" ? (
          <div className="px-2 py-1 bg-success/10 rounded-pill border border-success/30">
            <p className="text-body-sm font-normal text-success-strong">Completed</p>
          </div>
        ) : (
          <p className="text-body font-normal text-ink-60">{sub}</p>
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
        <Header showBack onBackClick={goBack} customText="Confirm Withdraw" />
      }
      footerAction={<Button onClick={handleConfirm}>Confirm</Button>}>
      <Section>
        <div className="flex items-center justify-center mt-5">
          <p className="text-ink-90 font-medium text-h2">NGN {amount}</p>
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
        <p className="mx-11 text-body-sm text-center font-normal text-ink-60">
          Bank Transfers typically works instantly! In rare cases, processing
          may take longer depending on your bank.
        </p>
      </Section>
    </PageShell>
  );
}
