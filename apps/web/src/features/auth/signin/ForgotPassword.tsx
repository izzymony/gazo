
'use client'

import useAuthStore from "@/store/authStore";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import Loader from "@vibaar/ui/common/Loader";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import BrandLogo from "@vibaar/ui/common/BrandLogo";
import StepNavigation from "@vibaar/ui/common/StepNavigation";
import Button from "@vibaar/ui/common/Button";
import Otp from "@/features/auth/signup/Otp";
import CreateNewPassword from "./CreateNewPassword";
import InputField from "@vibaar/ui/common/InputField";
import H1 from "@vibaar/ui/common/Typography";
import AuthSceneController from "@vibaar/ui/authScene/AuthSceneController";
import { AUTH_SCENES } from "../authScenes";
import { resolveAuthStep } from "../authSteps";
import useStepFocus from "../useStepFocus";



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
    const [isRedirecting] = useState(false);
    const searchParams = useSearchParams();
    const queryStep = searchParams.get('step');

    // The URL's step from the first render, not applied by an effect —
    // see SignInOverview for the request that behaviour caused. This screen
    // mounts no artwork on mobile either way, but the step also drives the
    // progress indicator and the focus target.
    const [step, setStep] = useState<number>(() => (queryStep ? Number(queryStep) : 0));

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

    // Forgot-password has no landing state: `?step` is required, and without it
    // the page renders a header, a progress bar and a live CTA over an empty
    // column. That URL keeps its current presentation rather than being dressed
    // up in a two-pane frame.
    const liveStep = resolveAuthStep("forgot-password", step);
    const stepRef = useStepFocus(liveStep);

    const onBack = () => {
        if (step > 1) {
            setStep(1);
            router.push(`?step=${1}`);
        } else {
            router.push(`/`);
        }
    };
    const progress = <StepNavigation step={step} totalSteps={3} />;
    const cta = (
        <Button onClick={handleNextStep} loading={isLoading}>
            {step === 3 ? "Reset Password" : "Continue"}
        </Button>
    );

    return (
        <>
            {
                isRedirecting ?
                    <Loader />
                    :
                    <>
                        {liveStep === null ? (
                        // `/forgot-password` with no `?step` renders a header, a
                        // progress bar and a live CTA over an empty column. That
                        // is a routing bug, not a layout one — it keeps exactly
                        // the presentation it has today rather than being handed
                        // a desktop media panel.
                        <PageShell
                            header={<Header onBack={onBack} title={<BrandLogo />} progress={progress} />}
                            footerAction={cta}>
                            <div className="flex flex-col w-full flex-1 pt-4" />
                        </PageShell>
                        ) : (
                        <AuthSceneController
                            // Every step here is a form step: artwork on desktop
                            // only, and not mounted at all on mobile. `rotate`
                            // is left off, so the panel holds one static scene
                            // with no dots and no timer.
                            scenes={AUTH_SCENES}
                            mediaOn="desktop"
                            actionMode="step"
                            header={
                                <Header
                                  // `lg:static` as well as `md:static`: Header is
                                  // `absolute lg:sticky lg:top-0`, and responsive
                                  // variants are independent, so the `md` term
                                  // alone lets it go sticky again at 1024 and,
                                  // being `w-full z-sticky`, paint over the media.
                                  className="md:static lg:static"
                                  onBack={onBack}
                                  title={<BrandLogo />}
                                  progress={progress}
                                />
                            }
                            footerAction={cta}
                        >
                            <div ref={stepRef} className="flex flex-col w-full flex-1 pt-4">
                                <div className="flex flex-col w-full flex-1">
                                    {step === 1 && (

                                        <div >
                                            <div className="flex-1">
                                                <H1 className="text-h1 text-start">Forgot Your Password?</H1>
                                                <p className="text-body mt-2 text-foreground-secondary text-start">No worries, we&apos;ll help you reset it. Enter email or <br /> phone number to receive your reset code . </p>
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
                                            <p className="text-body text-foreground-secondary font-normal text-start pt-8">
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
                        </AuthSceneController>
                        )}
                    </>
            }
        </>
    );
}