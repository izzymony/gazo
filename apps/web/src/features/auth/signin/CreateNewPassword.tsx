import React from 'react'
import InputField from '@vibaar/ui/common/InputField'
import H1 from '@vibaar/ui/common/Typography'

interface UserProfileSetupProps {
    profileData: {
        password?: string;
        confirmPassword?: string;
    };
    error: {
        password?: string,
        confirmPassword?: string,
    };
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const CreateNewPassword = ({ profileData, handleInputChange, error }: UserProfileSetupProps) => {
    return (
        <div className="flex-1">
            <H1 className="text-h1 text-start">Create New Password</H1>
            <p className="text-body text-ink-60 mt-2.5">Choose a unique password that&apos;s easy for you to remember but hard for others to guess. </p>

            <div className="space-y-4 mt-4">
                <InputField
                    type="password"
                    name="password"
                    value={profileData?.password}
                    onChange={handleInputChange}
                    placeholder="Password"
                    error={error?.password}

                // isReadonly={true}
                />
                <InputField
                    type="password"
                    name="confirmPassword"
                    value={profileData?.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="confirm Password"
                    error={error?.confirmPassword}

                />
            </div>

        </div>
    )
}

export default CreateNewPassword