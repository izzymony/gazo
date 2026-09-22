import InputField from "@vibaar/ui/common/InputField";
import H1 from "@vibaar/ui/common/Typography";
import { CircleCheck } from "@vibaar/ui/icons";

interface UserContactFormProps {
  emailPhone?: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  isGuestPrefill?: boolean;
}

export default function UserContactForm({
  emailPhone,
  handleInputChange,
  error,
  isGuestPrefill = false,
}: UserContactFormProps) {
  return (
    <div className="flex flex-col">
      <H1 className="text-h1 leading-[28px] text-start">
        {isGuestPrefill ? "Verify your contact" : "Enter your phone number or email to continue"}
      </H1>
      <p className="text-body mt-3 tracking-[0.5px] leading-[20px] text-foreground-muted text-start">
        {isGuestPrefill 
          ? "We've prefilled your contact info from your order. Please verify and continue." 
          : "Sign in or create new account with your phone number or email"}
      </p>
      {isGuestPrefill && (
        <div className="bg-success-surface border border-success-border rounded-field p-3 mt-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CircleCheck size={16} className="text-success-foreground" />
            </div>
            <div className="ml-3">
              <p className="text-body-sm text-success-foreground">
                Contact details from your recent order
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="mt-6">
        <InputField
          name="emailPhone"
          type="text"
          value={emailPhone}
          onChange={handleInputChange}
          placeholder="Enter phone number or email"
          error={error}
        />
      </div>
    </div>
  );
}
