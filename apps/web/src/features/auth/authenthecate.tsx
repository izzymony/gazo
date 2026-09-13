/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useState } from "react";
import OtpInput from "./otp";
import IconButton from "@vibaar/ui/common/IconButton";
import { BiArrowBack } from "@vibaar/ui/icons";

export default function Authenthecate({
  action,
  base = true,
  backAction,
  buttonAction,
  otpAction = async () => {},
  phone,
  buttonClicked,
}: {
  action: (val: string) => void;
  base?: boolean;
  backAction?: () => void;
  buttonAction?: () => Promise<void>;
  otpAction?: (val: string) => Promise<void>;
  phone?: string;
  buttonClicked: (val: string) => Promise<void>;
}) {
  const [otpValue, setOtpValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // `otpAction` is in the dep list: with `[]` the callback captured the first
  // render's prop and kept calling a stale closure.
  //
  // No toast either way: verifyOtpSent reports both outcomes itself. This used
  // to announce "OTP verification successful!!!" unconditionally — the store
  // swallowed rejections, so a WRONG code produced the error toast and the
  // success toast together.
  const handleComplete = useCallback(async (val: string) => {
    setOtpValue(val);
    try {
      await otpAction(val);
    } catch {
      // Reported by the store; nothing to add.
    }
  }, [otpAction]);

  return (
    <div className="flex-1 h-screen w-screen py-3 px-4 flex flex-col justify-between">
      <div className="gap-2 flex flex-col mb-4">
        <IconButton
          icon={BiArrowBack}
          label="Go back"
          className="-ml-2"
          onClick={base ? () => action("confirm") : backAction}
        />
        <p className="text-foreground-primary font-medium text-h1">
          Authenticate {base ? "Withdrawal" : "Account"}!
        </p>
        <p className="text-body-sm mt-2 font-normal text-foreground-secondary">
          We sent a 6 digit OTP code to the provided phone number:{" "}
          <span className="inline-flex font-medium text-foreground-primary">{phone || "Not set"}</span>
        </p>
      </div>
      <div className="flex-1 my-4 w-full flex flex-col gap-2 items-center">
        <OtpInput onComplete={handleComplete} />
      </div>
      <div className="w-full border-t border-outline py-2">
        <button type="button"
          onClick={
            isLoading
              ? undefined
              : base
              ? async () => {
                  if (buttonClicked) {
                    setIsLoading(true);
                    try {
                      await buttonClicked(otpValue);
                      action("withdrawalinitiated");
                    } catch (error) {
                      // Error is already handled in buttonClicked via toast
                      console.error("Withdrawal failed:", error);
                    } finally {
                      setIsLoading(false);
                    }
                  }
                }
              : buttonAction
          }
          className={`text-left w-full p-2 h-10 justify-center items-center flex font-medium w-full text-body-sm rounded-full cursor-pointer ${
            isLoading ? "bg-surface-strong text-brandInk cursor-not-allowed" : "bg-brand text-brandInk"
          }`}>
          {isLoading ? "Processing..." : base ? "Confirm withdrawal" : "Confirm"}
        </button>
      </div>
    </div>
  );
}
