"use client";

import WithdrawalDetails from "@/features/payouts/details";

export default function Page() {
  return (
    <div className="w-full">
      <WithdrawalDetails base={false} action={() => {}} />
    </div>
  );
}
