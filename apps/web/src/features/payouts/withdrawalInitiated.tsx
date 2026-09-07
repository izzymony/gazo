/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import Section from "@vibaar/ui/common/Section";
import Button from "@vibaar/ui/common/Button";

export default function WithdrawalInitiated({
  action,
  data,
  amount,
}: {
  action: (val: string) => void;
  data: {
    accountname: string;
    accountnumber: string;
    bankname: string;
    id: string;
  };
  amount: string;
}) {
  return (
    <PageShell
      header={
        <Header onBack={() => action("withdraw")} />
      }
      footerAction={
        <Button onClick={() => action("details")}>View details</Button>
      }>
      <Section className="flex flex-col gap-6 items-center mt-16">
        <div className="flex justify-center items-center">
          <svg
            width="104"
            height="83"
            viewBox="0 0 104 83"
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M51.9997 68.1673C66.7273 68.1673 78.6663 56.2282 78.6663 41.5007C78.6663 26.7731 66.7273 14.834 51.9997 14.834C37.2721 14.834 25.333 26.7731 25.333 41.5007C25.333 56.2282 37.2721 68.1673 51.9997 68.1673ZM66.8231 34.8347C67.5599 34.0118 67.49 32.7474 66.6671 32.0106C65.8441 31.2738 64.5797 31.3437 63.8429 32.1666L54.8585 42.2017C53.038 44.2352 51.8119 45.5974 50.7637 46.4784C49.7652 47.3177 49.1787 47.5007 48.6663 47.5007C48.154 47.5007 47.5675 47.3177 46.569 46.4784C45.5207 45.5974 44.2947 44.2352 42.4742 42.2017L40.1564 39.6129C39.4196 38.79 38.1552 38.7201 37.3323 39.4569C36.5093 40.1937 36.4395 41.4581 37.1763 42.281L39.5931 44.9805C41.2887 46.8745 42.703 48.4543 43.9953 49.5405C45.3623 50.6895 46.8368 51.5007 48.6663 51.5007C50.4959 51.5007 51.9704 50.6895 53.3374 49.5405C54.6297 48.4543 56.044 46.8745 57.7396 44.9805L66.8231 34.8347Z"
              fill="#06C270"
            />
            <path
              d="M78.667 9.5L79.9847 13.0612L83.5459 14.3789L79.9847 15.6967L78.667 19.2578L77.3492 15.6967L73.7881 14.3789L77.3492 13.0612L78.667 9.5Z"
              fill="#06C270"
            />
            <path
              d="M12.2139 42.6055L13.645 46.4731L17.5127 47.9043L13.645 49.3355L12.2139 53.2031L10.7827 49.3355L6.91504 47.9043L10.7827 46.4731L12.2139 42.6055Z"
              fill="#06C270"
            />
            <path
              d="M86.0779 53.2031L88.0795 58.6124L93.4888 60.614L88.0795 62.6156L86.0779 68.0249L84.0763 62.6156L78.667 60.614L84.0763 58.6124L86.0779 53.2031Z"
              fill="#06C270"
            />
          </svg>
        </div>
        <div className="flex justify-center items-center flex-col gap-2">
          <p className="text-h1 font-bold text-foreground-primary text-center">
            Withdrawal Initiated!
          </p>
          <p className="text-body font-normal text-foreground-secondary text-center">
            We are working on your transfer! Your money should enter your
            account shortly.
          </p>
        </div>
        <div className="p-3 border gap-3 flex flex-col bg-brand/10 w-full border-brandDeep rounded-field">
          <div className="flex flex-row justify-between items-center">
            <p className="text-foreground-secondary text-body-sm font-normal">Withdrawal</p>
            <p className="text-foreground-primary text-body-sm font-medium">NGN {amount}</p>
          </div>
          <div className="flex flex-row justify-between items-center">
            <p className="text-foreground-secondary text-body-sm font-normal">To:</p>
            <div className="items-end flex flex-col">
              <p className="text-foreground-primary text-body-sm font-medium">
                {data.bankname.slice(0, 3) || "ACC"}-Ending in {"  "}
                {data.accountnumber.slice(-4)}
              </p>
              <p className="text-foreground-secondary text-body-sm font-medium">
                {data.accountname || "Account Name"}
              </p>
            </div>
          </div>
        </div>
      </Section>
    </PageShell>
  );
}
