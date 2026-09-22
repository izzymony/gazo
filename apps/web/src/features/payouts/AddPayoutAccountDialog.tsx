"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ResponsiveRouteDialog from "@vibaar/ui/common/ResponsiveRouteDialog";
import PageActionButton from "@vibaar/ui/common/PageActionButton";
import Button from "@vibaar/ui/common/Button";
import OtpInput from "@/features/auth/otp";
import { OtpPrompt } from "@/features/auth/authenthecate";
import { AddPayoutAccountFields, useAddPayoutAccount } from "./addPayoutAccount";

/**
 * Dialog family 2 — add and authenticate a payout account.
 *
 * TWO STEPS IN ONE DIALOG, which is Q11's requirement and not a stylistic
 * choice. The panel does not close and reopen between the bank form and the OTP:
 * the same `useAddPayoutAccount` machine stays mounted, so Back returns to a form
 * that still holds the account number the seller typed. Stepping between two
 * dialogs, or between a dialog and a route, would discard it.
 *
 * Only the title, the body and the footer control change with the step. The
 * dialog's own close control means Back-out-of-the-flow and step-back-one are
 * distinguishable, which they were not when the OTP step replaced the whole page.
 */
export default function AddPayoutAccountDialog() {
  const router = useRouter();
  const m = useAddPayoutAccount(() => router.back());
  const [otpValue, setOtpValue] = useState("");

  return (
    <ResponsiveRouteDialog
      title={m.otp ? "Authenticate Account" : "Add Payout Account"}
      // Closing the dialog leaves the flow; stepping back stays in it.
      onClose={() => (m.otp ? m.setOtp(false) : router.back())}
      footer={
        m.otp ? (
          <PageActionButton onClick={m.createBanks} disabled={otpValue.length < 6}>
            Confirm
          </PageActionButton>
        ) : (
          <PageActionButton onClick={() => m.setOtp(true)}>Save</PageActionButton>
        )
      }>
      {m.otp ? (
        <div className="flex flex-col gap-4">
          <OtpPrompt title="Authenticate Account!" phone={m.phone} />
          <div className="my-2 flex w-full flex-col items-center gap-2">
            <OtpInput
              onComplete={async (val: string) => {
                setOtpValue(val);
              }}
            />
          </div>
          <Button
            variant="link"
            size="sm"
            fullWidth={false}
            onClick={() => m.setOtp(false)}>
            Back to account details
          </Button>
        </div>
      ) : (
        <AddPayoutAccountFields machine={m} />
      )}
    </ResponsiveRouteDialog>
  );
}
