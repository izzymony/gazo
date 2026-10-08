/* eslint-disable @typescript-eslint/no-unused-vars */
// Otp.tsx
import React from "react";
import H1 from "@vibaar/ui/common/Typography";
import { FormikErrors } from "formik";
import OtpInput from "@/features/auth/otp";
import useProductStore from "@/store/productStore";

interface OtpProps {
  otp: string;
  error?: string | string[] | FormikErrors<unknown>[] | undefined;
  setOtpValue?: (val: string) => void;
  verificationType?: "register_otp" | "withdrawal_otp" | null;
  email: string;
  setFieldValue: (
    field: string,
    value: unknown,
    shouldValidate?: boolean | undefined
  ) => void;
}

const Otp = ({
  otp,
  email,
  error,
  setFieldValue,
  setOtpValue = () => { },
  verificationType = "register_otp",
}: OtpProps) => {
  const { verifyOtpSent } = useProductStore();
  return (
    <div className="mt-16 w-full flex-1">
      <div className="flex flex-col w-full flex-1">
        <H1 className="text-h1 leading-[24px] text-start">
          Check your Inbox!
        </H1>
        <p className="text-body mt-3 tracking-[0.5px] leading-[20px] text-foreground-muted text-start">
          We sent a verification code to the provided <br /> email: {email}
        </p>
        <div className="mt-6">
          <OtpInput
            onComplete={async (val) => {
              setOtpValue(val);
              setFieldValue("otp", val);
              if (verificationType) {
                try {
                  await verifyOtpSent({
                    identifier: email,
                    otp: val,
                    verification_type: verificationType,
                  });
                } catch {
                  // verifyOtpSent reports the failure itself. It now re-throws, and
                  // this handler is awaited by OtpInput with no catch of its own —
                  // without this the rejection would surface as an unhandled
                  // promise rejection.
                }
              }
            }}
          // otp={otp}
          // error={error && error}
          // setFieldValue={setFieldValue}
          />
        </div>
      </div>
    </div>
  );
};

export default Otp;
