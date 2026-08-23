
'use client'

import useAuthStore from "@/store/authStore";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import Loader from "@vibaar/ui/common/Loader";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@/design-system/common/Header";
import Button from "@vibaar/ui/common/Button";
import Otp from "@/features/auth/signup/Otp";
import CreateNewPassword from "./CreateNewPassword";
import InputField from "@vibaar/ui/common/InputField";
import H1 from "@vibaar/ui/common/Typography";



const validationSchema = [
    // Step 1 validation (email)
    Yup.object({
        email: Yup.string()
            .required("Email or phone number is required")
            .test(
                "email-or-phone",
                "Enter a valid email or phone number",
                (value) => {
                    if (!value) return false;
                    const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
                    const isPhone = /^\+?[0-9]{7,15}$/.test(value.replace(/\s/g, ""));
                    return isEmail || isPhone;
                }
            ),
    })
    ,
    // Step 2 validation (OTP) — a single 6-digit string, matching the shared Otp component
    Yup.object().shape({
        otp: Yup.string()
            .matches(/^\d{6}$/, "Enter the 6-digit code")
            .required("OTP is required"),
    }),


    // Step 3 validation (profile setup)
    Yup.object({
        password: Yup.string()
            .required("Password is required")
            .matches(
                /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>])(?=.*\d).{8,}$/,
                "Password must contain at least 8 characters, one uppercase letter, one number, and one special character"
            ),
        confirmPassword: Yup.string()
            .oneOf([Yup.ref('password')], "Passwords must match")
            .required("Confirm Password is required"),
    }),
];


export default function ForgotPasswordComp() {
    const router = useRouter();
    const { isLoading, sendOtp, forgotPassword } = useAuthStore();
    const [step, setStep] = useState<number>(0);
    const [isRedirecting] = useState(false);
    const searchParams = useSearchParams();
    const queryStep = searchParams.get('step');

    useEffect(() => {
        if (queryStep) {
            setStep(Number(queryStep));
        }
    }, [queryStep]);

    const handleNextStep = async () => {
        const errors = await formik.validateForm();
        if (step === 1) {
            if (!errors.email) {
                sendOtp({
                    identifier: formik.values.email,
                    request_type: 'forgot_password',
                }, () => { 
                    setStep(2);
                    router.push(`?step=2`);

                });
            } else {
                formik.setErrors(errors);
            }
        } else if (step === 2) {

            if (formik.values.otp.length === 6) {
                setStep(3);
                router.push(`?step=3`);
            } else {
                formik.setErrors({ otp: "OTP must be complete" });
            }
        } else if (step === 3) {
            forgotPassword({
                    indentifier: formik.values.email,
                    new_password: formik.values.password,
                    code: formik.values.otp,
                }, () => {
                    router.push('signin?step=1')
                 });
           
        }
    };




    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                // setStore({ ...store, logo: e.target.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const formik = useFormik({
        initialValues: {
            email: "",
            otp: "",
            password: "",
            confirmPassword: "",
        },
        validationSchema: validationSchema[step - 1],
        onSubmit: handleNextStep,
        validateOnChange: true,
        validateOnBlur: true,
    });

    return (
        <>
            {
                isRedirecting ?
                    <Loader />
                    :
                    <>


                        <PageShell
                            header={
                                <Header
                                    showBack
                                    showLogo
                                    showStepNavigation
                                    step={step}
                                    totalSteps={3}
                                    onBackClick={() => {
                                        if (step > 1) {
                                            setStep(1);
                                            router.push(`?step=${1}`);
                                        } else {
                                            router.push(`/`);
                                        }
                                    }}
                                />
                            }
                            footerAction={
                                <Button onClick={handleNextStep} loading={isLoading}>
                                    {step === 3 ? "Reset Password" : "Continue"}
                                </Button>
                            }
                        >
                            <div className="flex flex-col w-full flex-1 pt-4">
                                <div className="flex flex-col w-full flex-1">
                                    {step === 1 && (

                                        <div >
                                            <div className="flex-1">
                                                <H1 className="text-h1 text-start">Forgot Your Password?</H1>
                                                <p className="text-body mt-2 text-ink-60 text-start">No worries, we&apos;ll help you reset it. Enter email or <br /> phone number to receive your reset code . </p>
                                                <div className="mt-6">
                                                    <InputField
                                                        name='email'
                                                        type="text"
                                                        value={formik.values.email}
                                                        onChange={formik.handleChange}
                                                        placeholder="Enter phone number or email"
                                                        error={formik.errors.email}
                                                    />

                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {step === 2 && (
                                        <>
                                            <Otp
                                                otp={formik.values.otp}
                                                email={formik.values.email}
                                                error={formik.errors?.otp as string}
                                                setFieldValue={formik.setFieldValue}
                                            />
                                            <p className="text-body text-ink-60 font-normal text-start pt-8">
                                                If you haven&apos;t received the mail try checking your <br /> spam folder or resending it.
                                            </p>
                                        </>
                                    )}
                                    {step === 3 && (
                                        <CreateNewPassword
                                            profileData={formik.values}
                                            error={formik.errors}
                                            handleInputChange={formik.handleChange}
                                            handleFileUpload={handleFileUpload}
                                        />
                                    )}

                                </div>
                            </div>
                        </PageShell>

                    </>
            }
        </>
    );
}