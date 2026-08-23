/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useState } from "react";

const OTP_LENGTH = 6;

export default function OtpInput({
  onComplete,
}: {
  onComplete: (val: any) => Promise<void>;
}) {
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const inputRefs = useRef<any>([]);
  const [isValid, setIsValid] = useState<any>(null);

  const handleChange = async (value: string, index: number) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setIsValid(null); // reset validation border

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1].focus();
    }

    if (newOtp.every((digit) => digit !== "")) {
      try {
        await onComplete(newOtp.join(""));
        setIsValid(true);
      } catch (err: any) {
        //(err);
        setIsValid(false);
      }
    }
  };

  const handleKeyDown = (e: any, index: number) => {
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleFocus = (e: any) => {
    e.target.select();
  };

  return (
    <div style={{ display: "flex", gap: "8px" }}>
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(e.target.value, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onFocus={handleFocus}
          style={{
            width: "100%",
            height: "70px",
            fontSize: "24px",
            textAlign: "center",
            backgroundColor: "#fff",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            border:
              isValid === true
                ? "1px solid green"
                : document.activeElement === inputRefs.current[index]
                ? "1px solid red"
                : "1px solid transparent",
            borderRadius: "8px",
            outline: "none",
            transition: "border 0.2s ease",
          }}
        />
      ))}
    </div>
  );
}
