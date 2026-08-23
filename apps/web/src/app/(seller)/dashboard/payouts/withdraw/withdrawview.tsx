/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Authenthecate from "@/features/auth/authenthecate";
import Confirm from "@/features/payouts/confirm";
import WithdrawalDetails from "@/features/payouts/details";
import SelectAccount from "@/features/payouts/selectaccount";
import Withdraw from "@/features/payouts/withdraw";
import WithdrawalInitiated from "@/features/payouts/withdrawalInitiated";
import useAuthStore from "@/store/authStore";
import useBusinessStore, { BankAccount } from "@/store/businessStore";
import useProductStore from "@/store/productStore";
import { useState } from "react";

export default function WithdrawView() {
  const { user } = useAuthStore();
  const { withdrawFund, bankAccounts, walletAnalytics, singleStore } = useBusinessStore();
  const { verifyOtpSent } = useProductStore();
  const det: BankAccount =
    bankAccounts.length > 0
      ? bankAccounts[0]
      : {
          id: "",
          created_at: "", // ISO date string
          updated_at: "", // ISO date string
          bank: "",
          account_number: "",
          account_name: "",
          bank_code: 0,
          business_id: "",
          is_default: false,
          metadata: [],
        };
  const [view, setView] = useState("withdraw");
  const [data, setData] = useState<{
    accountname: string;
    accountnumber: string;
    bankname: string;
    id: string;
  }>({
    accountname: det.account_name,
    accountnumber: det.account_number,
    bankname: det.bank,
    id: det.id,
  });
  const [amount, setAmount] = useState<string>("");
  const [receipt, setReceipt] = useState<{
    amount: number;
    created_at: string;
    reference: string;
    status: string;
  }>({
    amount: 0,
    created_at: "",
    reference: "",
    status: "",
  });

  const buttonClicked = async (val: string) => {
    // Use the actual OTP entered by the user
    const response: any = await withdrawFund({
      amount: +amount,
      bank_account_details_id: data.id,
      otp: val,
    });
    if (response) {
      setReceipt({
        amount: +amount,
        created_at: response.created_at,
        reference: response.reference,
        status: response.status,
      });
    }
  };

  const response =
    view === "withdraw" ? (
      <Withdraw
        action={setView}
        data={data}
        amount={amount}
        setAmount={setAmount}
      />
    ) : view === "selectaccount" ? (
      <SelectAccount
        goBack={() => setView("withdraw")}
        action={(val: {
          accountname: string;
          accountnumber: string;
          bankname: string;
          id: string;
        }) => {
          setData(val);
          setView("withdraw");
        }}
      />
    ) : view === "confirm" ? (
      <Confirm
        action={setView}
        goBack={() => setView("withdraw")}
        data={data}
        amount={amount}
      />
    ) : view == "authenthecate" ? (
      <Authenthecate
        action={setView}
        phone={singleStore.phone || user?.phone}
        buttonClicked={buttonClicked}
        otpAction={(val) =>
          verifyOtpSent({
            identifier: user?.email + "",
            otp: val,
            verification_type: "withdrawal_otp",
          })
        }
      />
    ) : view == "withdrawalinitiated" ? (
      <WithdrawalInitiated data={data} amount={amount} action={setView} />
    ) : view == "details" ? (
      <WithdrawalDetails
        action={setView}
        data={{
          amount: receipt.amount + "",
          created_at: receipt.created_at,
          reference: receipt.reference,
          status: receipt.status,
          bankname: data.bankname,
          accountnumber: data.accountnumber,
          accountname: data.accountname,
        }}
        balanceAfter={`₦ ${+walletAnalytics.available_balance - +amount}`}
      />
    ) : (
      <></>
    );

  return response;
}
