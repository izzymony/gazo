"use client";

import InputField from "@vibaar/ui/common/InputField";
import { PasswordInput } from "@vibaar/ui/common/inputs";
import H1 from "@vibaar/ui/common/Typography";
import Link from "next/link";

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
      <p className="text-body tracking-[0px] mt-2 text-foreground-secondary text-start">
        {isDirectLogin 
          ? "Please enter your email or phone number and password to sign in to your Vibaar account"
          : "Please enter your password to sign in to your Vibaar account"
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

      {/* A real button, at the same size as the sign-up line below it.
          This was an `<h1 onClick>` carrying no font-size class, so it took
          16px by inheritance and weight 600 from the global heading rule —
          next to a 12px/450 sibling it read as a heading rather than a link.
          As an h1 it was also unfocusable and ignored Enter and Space, and it
          announced itself as a top-level heading to a screen reader. */}
      <div className="mt-4 flex justify-end">
        <Link
          href="/forgot-password?step=1"
          className="text-body-sm font-medium text-brandDeep hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandDeep/40 rounded-field">
          Forgot password?
        </Link>
      </div>
    </div>
  );
}