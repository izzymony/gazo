/* eslint-disable react-hooks/exhaustive-deps */
'use client'
import useAuthStore from "@/store/authStore";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Otp from "./Otp";
import H1 from "@vibaar/ui/common/Typography";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import BrandLogo from "@vibaar/ui/common/BrandLogo";
import StepNavigation from "@vibaar/ui/common/StepNavigation";
import Button from "@vibaar/ui/common/Button";
import { useFormik } from "formik";
import * as Yup from "yup";
import Loader from "@vibaar/ui/common/Loader";
import useBusinessStore from "@/store/businessStore";
import useProductStore from "@/store/productStore";
import InputField from "@vibaar/ui/common/InputField";
import { splitFullName } from "@/lib/nameUtils";

const validationSchema = [
  // Step 1 validation (email)
  Yup.object({
    email: Yup.string().email("Invalid email format").required("Email is required"),
  }),
  // Step 2 validation (OTP)
  Yup.object().shape({
    otp: Yup.array()
      .of(
        Yup.string()
          .matches(/^\d$/, "Each OTP digit must be a number")
          .required("OTP digit is required")
      )
      .required("OTP is required"),
  }),


  // Step 3 validation (profile setup)
  Yup.object({
    fullName: Yup.string().required("Full name is required"),
    user_name: Yup.string().required("Username is required"),
    phoneNumber: Yup.string().required("Phone number is required"),
  }),
];

export default function SocialAuth() {
  const router = useRouter();
  const { clearUserState, signup, isLoading } = useAuthStore();
  const { clearStoreState } = useBusinessStore();
  const { clearProductState } = useProductStore();
  const [step, setStep] = useState<number>(1);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const searchParams = useSearchParams();
  const queryStep = searchParams.get('step');

  useEffect(() => {
    if (queryStep) {
      setStep(Number(queryStep));
    }
  }, [queryStep]);

  useEffect(() => {
    clearUserState();
    clearStoreState();
    clearProductState();
  }, []);


  const handleNextStep = async () => {

    const errors = formik.validateForm();
    // setOtpData(values.otp);

    if (Object.keys(errors).length === 0) { // No errors
      if (step < 2) {
        // router.push(`?step=${step + 1}`);
        // Trigger the signup action at the final step
        signup({
          "phone": formik.values.phoneNumber,
          "email": formik.values.email,
          ...splitFullName(formik.values.fullName),
          "user_name": formik.values.user_name,
          auth_type: "instagram"
        },


          () => {
            setIsRedirecting(true)
            router.push("/dashboard");
          }
        );
        router.push("/dashboard");

      } else if (step === 2) {
        if (formik.values.otp.length < 6) {
          formik.setErrors({ otp: "OTP must be 6 characters" });

        }
      }
    }
  };

  // const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = e.target.files?.[0];
  //   if (file) {
  //     const reader = new FileReader();
  //     reader.onload = () => {
  //       // setStore({ ...store, logo: e.target.result });
  //     };
  //     reader.readAsDataURL(file);
  //   }
  // };

  const formik = useFormik({
    initialValues: {
      email: "",
      otp: Array(6).fill(""),
      fullName: "",
      user_name: "",
      phoneNumber: "",
      password: "",
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

          <PageShell
            header={
              <Header
                onBack={() => {
                  router.back()
                }}
                title={<BrandLogo />}
                progress={<StepNavigation step={step} totalSteps={2} />}
              />
            }
            footerAction={
              <Button onClick={() => formik.handleSubmit()} loading={isLoading}>
                Continue
              </Button>
            }
          >
            <div className="flex flex-col w-full flex-1 pt-4">
              <div className="flex flex-col w-full flex-1">
                {step === 1 && (
                  <div className="flex-1">
                    <H1 className="text-h1 text-start">Complete profile setup</H1>
                    <p>Enter your personal details</p>
                    <div className="space-y-4 mt-4">
                      <InputField
                        type="text"
                        name="fullName"
                        value={formik.values?.fullName}
                        onChange={formik.handleChange}
                        placeholder="Full name"
                        error={formik.errors?.fullName}
                      />
                      <InputField
                        type="text"
                        name="user_name"
                        value={formik.values?.user_name}
                        onChange={formik.handleChange}
                        placeholder="Username"
                        error={formik.errors?.user_name}

                      />
                      <InputField
                        type="text"
                        name="phoneNumber"
                        value={formik.values?.phoneNumber}
                        onChange={formik.handleChange}
                        placeholder="Phone number"
                        error={formik.errors?.phoneNumber}
                      />
                      <InputField
                        type="email"
                        name="email"
                        value={formik.values?.email}
                        onChange={formik.handleChange}
                        placeholder="Email"
                      // isReadonly={true}
                      />

                    </div>

                  </div>
                )}
                {step === 2 && (
                  <>
                    <Otp
                      otp={formik.values.otp as unknown as string}
                      email={formik.values.email}
                      error={formik.errors.otp}
                      setFieldValue={formik.setFieldValue}
                    />
                    <p className="text-body text-foreground-secondary font-normal text-start pt-8">
                      If you haven&apos;t received the mail try checking your <br /> spam folder or resending it.
                    </p>
                  </>
                )}

              </div>
            </div>
          </PageShell>
        //   )}
        // </>
      }
    </>
  );
}
