/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BankDetails from "@/features/store-setup/BankDetails";
import useBusinessStore, { BankData } from "@/store/businessStore";

/**
 * Adding a payout account: the bank form, the OTP step, and the one create call.
 *
 * Split from its screen so the canonical route and the intercepted dialog share
 * a single state machine. That sharing is load-bearing rather than tidy: Q11
 * requires the two steps to live in ONE dialog with the entered values surviving
 * a Back, and the only way two surfaces can promise that identically is for
 * there to be one place where the values are held.
 */
export function useAddPayoutAccount(
  /**
   * Where a successful create goes. The canonical page navigates to the payouts
   * list; the dialog unwinds its own interception instead, because pushing to
   * the route underneath leaves the panel mounted on top of it — the modal slot
   * only clears on `router.back()`.
   */
  onDone?: () => void
) {
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
    const datas: BankData = {
      is_default: checked,
      account_name: data.account_name || "",
      account_number: data.account_number || "",
      bank_code: +selectedBank.BankCode,
      bank: banks,
    };
    // Navigate only on a confirmed create. The `.then()` had no `.catch()`, and
    // createBank used to resolve on failure — so a rejected bank account still
    // sent the user to the payouts list as though it had been added.
    try {
      await createBank(datas);
    } catch {
      // createBank toasts the reason; stay on the form so it can be corrected.
      return;
    }
    if (onDone) onDone();
    else router.push("/dashboard/payouts");
  };

  const handleInputChange = (e: { target: { name: string; value: string } }) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
    setError((prev) => ({ ...prev, [name]: "" }));
  };

  return {
    otp,
    setOtp,
    data,
    error,
    checked,
    setChecked,
    setBanks,
    handleInputChange,
    createBanks,
    phone: singleStore?.phone || "",
  };
}

type Machine = ReturnType<typeof useAddPayoutAccount>;

/** Step 1 — the bank details and the default flag. */
export function AddPayoutAccountFields({ machine }: { machine: Machine }) {
  return (
    <>
      <BankDetails
        data={machine.data}
        error={machine.error}
        handleInputChange={machine.handleInputChange as any}
        setBanks={machine.setBanks}
      />
      <div className="flex gap-2 items-center mt-6">
        <input
          type="checkbox"
          checked={machine.checked}
          onClick={() => machine.setChecked(!machine.checked)}
          className="custom-checkbox"
        />
        <p className="text-body font-medium text-foreground-primary">Set as default</p>
      </div>
    </>
  );
}
