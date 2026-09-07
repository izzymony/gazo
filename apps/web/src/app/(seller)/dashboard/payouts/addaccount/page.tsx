/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Authenthecate from "@/features/auth/authenthecate";
import BankDetails from "@/features/store-setup/BankDetails";
import useBusinessStore, { BankData } from "@/store/businessStore";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import Section from "@vibaar/ui/common/Section";
import Button from "@vibaar/ui/common/Button";

export default function Page() {
  const router = useRouter();
  const { selectedBank, createBank, singleStore } = useBusinessStore();
  const [otp, setOtp] = useState(false);
  const [banks, setBanks] = useState("");
  const [data, setData] = useState<{
    bank_name: string;
    account_number?: string;
    account_name?: string;
  }>({
    bank_name: "",
    account_name: selectedBank?.AccountName || "",
    account_number: selectedBank?.AccountNumber || "",
  });
  const [error, setError] = useState<{
    bank_name: string;
    account_number?: string;
    account_name?: string;
  }>({ bank_name: "", account_name: "", account_number: "" });
  const [checked, setChecked] = useState(false);

  const createBanks = async () => {
    //(banks);
    const datas: BankData = {
      is_default: checked,
      account_name: data.account_name || "",
      account_number: data.account_number || "",
      bank_code: +selectedBank.BankCode,
      bank: banks,
    };
    await createBank(datas).then(() => {
      router.push("/dashboard/payouts");
    });
  };

  const response = otp ? (
    <Authenthecate
      action={(val: any) => {
        //(val);
      }}
      base={false}
      backAction={() => setOtp(false)}
      buttonAction={createBanks}
      phone={singleStore?.phone || ""}
      buttonClicked={function (val: string): Promise<void> {
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
      footerAction={
        <Button
          onClick={() => {
            setOtp(true);
          }}>
          Save
        </Button>
      }>
      <Section>
        <BankDetails
          data={data}
          error={error}
          handleInputChange={(e) => {
            const { name, value } = e.target;

            setData((prev) => ({
              ...prev,
              [name]: value,
            }));

            setError((prev) => ({
              ...prev,
              [name]: "",
            }));
          }}
          setBanks={setBanks}
        />
        <div className="flex gap-2 items-center mt-6">
          <input
            type="checkbox"
            checked={checked}
            onClick={() => setChecked(!checked)}
            className="custom-checkbox"
          />
          <p className="text-body font-medium text-foreground-primary">Set as default</p>
        </div>
      </Section>
    </PageShell>
  );
  return response;
}
