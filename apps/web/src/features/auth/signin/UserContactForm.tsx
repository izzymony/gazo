"use client";
import { useRouter } from "next/navigation";

import InputField from "@/design-system/common/InputField";
import { PasswordInput } from "@/design-system/common/inputs";
import H1 from "@/design-system/common/Typography";

interface UserContactFormProps {
  identifier?: string;
  identifierError?: string;
  password?: string;
  passwordError?: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: "email" | "phone";
  username?: string;
  isDirectLogin?: boolean; // New prop to indicate direct login from button
  onSubmit?: () => void; // Add submit handler for Enter key
}

export default function UserContactForm({
  identifier,
  identifierError,
  password,
  passwordError,
  handleInputChange,
  type,
  username,
  isDirectLogin = false,
  onSubmit,
}: UserContactFormProps) {
  const router = useRouter();

  const inputType = type === "email" ? "email" : type === "phone" ? "tel" : "text";
  const placeholder = type ? `Enter ${type}` : "Enter email or phone number";
  const labelText = type ? `${type}` : "email or phone number";

  return (
    <div className="flex-1">
      <H1 className="text-h1 leading-[24px] text-start">
        Welcome back{!isDirectLogin && (
          <>, <span className="font-semibold">{username || "[Username]"}</span></>
        )}! 🫡
      </H1>
      <p className="text-body tracking-[0px] mt-2 text-ink-60 text-start">
        {isDirectLogin 
          ? "Please enter your email or phone number and password to sign in to your myInstaShop account"
          : "Please enter your password to sign in to your myInstaShop account"
        }
      </p>
      <div className="mt-6">
        <InputField
          name="identifier"
          type={inputType}
          value={identifier}
          onChange={handleInputChange}
          placeholder={placeholder}
          error={identifierError}
          onEnterPress={onSubmit}
          inputMode={type === "email" ? "email" : type === "phone" ? "tel" : "text"}
        />
      </div>
      <div className="mt-6">
        <PasswordInput
          name="password"
          value={password}
          onChange={handleInputChange}
          placeholder="Enter password"
          error={passwordError}
          mode="signin"
          onEnterPress={onSubmit}
        />
      </div>

      <h1
        className="text-instaRed text-right mt-4 cursor-pointer"
        onClick={() => router.push("forgot-password?step=1")}>
        Forgot password?
      </h1>
    </div>
  );
}