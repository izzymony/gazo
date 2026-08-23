import React from "react";
import InputField from "@/design-system/common/InputField";
import H1 from "@/design-system/common/Typography";
import { formatPhoneNumber as formatPhone } from "@/lib/validation";
import { AiOutlineInfoCircle, CircleCheck, X } from "@/design-system/icons";

interface UserProfileSetupProps {
  profileData: {
    fullName: string;
    user_name: string;
    phoneNumber: string;
    passwords: string;
    email: string;
    referral_username?: string;
  };
  error: {
    fullName?: string;
    user_name?: string;
    phoneNumber?: string;
    passwords?: string;
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isGuestPrefill?: boolean;
  referralValid?: boolean | null;
  referrerName?: string;
}

const ProfileSetup = ({
  profileData,
  handleInputChange,
  error,
  isGuestPrefill = false,
  referralValid = null,
  referrerName = "",
}: UserProfileSetupProps) => {
  // Handle browser autofill - force formik to update on mount
  React.useEffect(() => {
    // Small delay to let browser autofill complete
    const timer = setTimeout(() => {
      // Check all input fields for autofilled values
      const inputs = document.querySelectorAll('input[name="fullName"], input[name="user_name"], input[name="phoneNumber"], input[name="email"]');
      inputs.forEach((input: any) => {
        if (input.value && input.value !== profileData[input.name as keyof typeof profileData]) {
          // Browser has autofilled but formik doesn't know
          const event = new Event('change', { bubbles: true });
          Object.defineProperty(event, 'target', {
            writable: false,
            value: input
          });
          handleInputChange(event as any);
        }
      });
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col">
      <H1 className="text-h1 leading-[24px] text-start">
        Complete profile setup
      </H1>
      <p className="text-body mt-3 tracking-[0.5px] leading-[20px] text-ink-40 text-start">
        {isGuestPrefill 
          ? "Review and complete your profile details. Some fields are prefilled from your order." 
          : "Enter your personal details"}
      </p>

      {isGuestPrefill && (
        <div className="bg-info/10 border border-info/20 rounded-field p-3 mt-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AiOutlineInfoCircle size={16} className="text-info" />
            </div>
            <div className="ml-3">
              <p className="text-body-sm text-info">
                Name and phone prefilled from your delivery info
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 mt-6">
        <InputField
          type="text"
          name="fullName"
          value={profileData?.fullName}
          onChange={(e) => {
            console.log("🔄 fullName onChange triggered:", e.target.value);
            handleInputChange(e);
          }}
          placeholder="Full name"
          error={error?.fullName}
        />
        <div style={{ position: 'relative', width: '100%' }}>
          <span
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#888',
              fontSize: '16px',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          >@</span>
          <InputField
            type="text"
            name="user_name"
            value={profileData?.user_name}
            onChange={(e) => {
              console.log("🔄 user_name onChange triggered:", e.target.value);
              handleInputChange(e);
            }}
            placeholder="Username"
            error={error?.user_name}
            className="pl-8"
          />
        </div>
        <InputField
          type="text"
          name="phoneNumber"
          value={profileData?.phoneNumber}
          onChange={(e) => {
            const formatted = formatPhone(e.target.value);
            e.target.value = formatted;
            handleInputChange(e);
          }}
          placeholder="Phone number"
          error={error?.phoneNumber}
        />
        <InputField
          type="email"
          name="email"
          value={profileData?.email}
          onChange={handleInputChange}
          placeholder="Email"
        // isReadonly={true}
        />

        {/* Referral ID Input - Optional */}
        <div className="mt-2">
          <p className="text-body-sm text-ink-40 mb-2">Referral ID (optional)</p>
          <div style={{ position: 'relative', width: '100%' }}>
            <span
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#888',
                fontSize: '16px',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            >@</span>
            <InputField
              type="text"
              name="referral_username"
              value={profileData?.referral_username || ""}
              onChange={(e) => {
                // Strip @ if user pastes it
                const value = e.target.value.replace('@', '');
                e.target.value = value;
                handleInputChange(e);
              }}
              placeholder="Friend's username"
              className="pl-8"
            />
            {/* Validation indicator */}
            {referralValid !== null && profileData?.referral_username && (
              <div
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              >
                {referralValid ? (
                  <CircleCheck size={20} className="text-success-strong" />
                ) : (
                  <X size={20} className="text-red" />
                )}
              </div>
            )}
          </div>
          {/* Referrer name display */}
          {referralValid && referrerName && (
            <p className="text-body-sm text-success-strong mt-1">
              Referred by {referrerName} - You&apos;ll both earn rewards on your first order!
            </p>
          )}
          {referralValid === false && profileData?.referral_username && (
            <p className="text-body-sm text-red mt-1">
              Username not found
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;