/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useState } from "react";
import OtpInput from "./otp";
import { toast } from "sonner";
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
  const handleComplete = useCallback(async (val: any) => {
    setOtpValue(val);
    await otpAction(val);
    toast.success("OTP verification successful!!!");
  }, []);

  return (
    <div className="flex-1 h-screen w-screen py-3 px-4 flex flex-col justify-between">
      <div className="gap-2 flex flex-col mb-4">
        <IconButton
          icon={BiArrowBack}
          label="Go back"
          className="-ml-2"
          onClick={base ? () => action("confirm") : backAction}
        />
        <p className="text-ink-90 font-medium text-h1">
          Authenticate {base ? "Withdrawal" : "Account"}!
        </p>
        <p className="text-body-sm mt-2 font-normal text-ink-60">
          We sent a 6 digit OTP code to the provided phone number:{" "}
          <span className="inline-flex font-medium text-ink-90">{phone || "Not set"}</span>
        </p>
      </div>
      <div className="flex-1 my-4 w-full flex flex-col gap-2 items-center">
        <OtpInput onComplete={handleComplete} />
      </div>
      <div className="w-full border-t border-ink-10 py-2">
        <div
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
          className={`p-2 h-10 justify-center items-center flex text-white font-medium w-full text-body-sm rounded-full cursor-pointer ${
            isLoading ? "bg-ink-30 cursor-not-allowed" : "bg-brand"
          }`}>
          {isLoading ? "Processing..." : base ? "Confirm withdrawal" : "Confirm"}
        </div>
      </div>
    </div>
  );
}
