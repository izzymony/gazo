/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import useAuthStore from "@/store/authStore";
import { Client } from "@/lib/client";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import UserProfileSetup from "./ProfileSetup";
import Otp from "./Otp";
import UserContactForm from "./UserContactForm";
import { signupOptions } from "@/lib/conts";
import AuthOptionButton, { type AuthOption } from "../AuthOptionButton";
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
import useShippingStore from "@/store/shippingStore";
import useOrderStore from "@/store/orderStore";
import InputField from "@vibaar/ui/common/InputField";
import PasswordCriteria from "@vibaar/ui/common/PasswordCriteria";
import { formatPhoneNumber } from "@/lib/generator";
import AnimatedImages from "@vibaar/ui/animated/AnimatedImages";
import AuthSplitShell from "@vibaar/ui/AuthSplitShell";
import SlideContent from "@vibaar/ui/animated/SlideContent";
import { slidesData } from "@vibaar/ui/animated/slidesData";
import Footer from "@vibaar/ui/common/Footer";
import FEATURES from "@/config/features";
import { splitFullName, isValidFullName } from "@/lib/nameUtils";
import { validateFullName, validatePhoneNumber, validateEmail, validateUsername } from "@/lib/validation";
import { trackSignUp, setUserProperties, trackFormError } from "@/lib/analytics";

// Check if OTP is enabled via feature flag
const isOtpEnabled = FEATURES.OTP_VERIFICATION_ENABLED;

const validationSchema = [
  // Step 1 validation (emailPhone)
  Yup.object({
    emailPhone: Yup.string()
      .required("Email or phone is required")
      .test("is-email-or-phone", "Invalid email or phone format", (value) => {
        if (!value) return false;
        const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
        const phoneRegex = /^\+?\d{10,15}$/;
        return emailRegex.test(value) || phoneRegex.test(value);
      }),
  }),
  // Step 2 validation (OTP) - Skip validation if OTP is disabled
  Yup.object({
    otp: isOtpEnabled ? Yup.string().required("OTP is required") : Yup.string(),
  }),
  // Step 3 validation (passwords)
  Yup.object({
    passwords: Yup.string()
      .min(8, "Password must be at least 8 characters")
      .required("Password is required"),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref("passwords")], "Passwords must match")
      .required("Confirm Password is required"),
  }),
  // Step 4 validation (profile setup)
  Yup.object({
    fullName: Yup.string()
      .required("Full name is required")
      .test('valid-full-name', '', (value) => {
        if (!value) return false;
        const error = validateFullName(value);
        if (error) {
          return new Yup.ValidationError(error, value, 'fullName');
        }
        return true;
      }),
    user_name: Yup.string()
      .required("Username is required")
      .test('valid-username', '', (value) => {
        if (!value) return false;
        const error = validateUsername(value);
        if (error) {
          return new Yup.ValidationError(error, value, 'user_name');
        }
        return true;
      }),
    phoneNumber: Yup.string()
      .required("Phone number is required")
      .test('nigerian-phone', '', (value) => {
        if (!value) return false;
        const error = validatePhoneNumber(value);
        if (error) {
          return new Yup.ValidationError(error, value, 'phoneNumber');
        }
        return true;
      }),
  }),
];

// Helper to get correct validation schema based on step and OTP feature flag
// When OTP is disabled, step numbers don't map 1:1 to schema array indices
const getSchemaForStep = (currentStep: number, otpEnabled: boolean) => {
  if (currentStep === 0) return undefined;

  if (otpEnabled) {
    // With OTP enabled: direct mapping
    // Step 1 -> schema[0] (emailPhone)
    // Step 2 -> schema[1] (otp)
    // Step 3 -> schema[2] (passwords)
    // Step 4 -> schema[3] (profile)
    return validationSchema[currentStep - 1];
  } else {
    // With OTP disabled: skip OTP schema (index 1)
    // Step 1 -> schema[0] (emailPhone)
    // Step 2 -> schema[2] (passwords)
    // Step 3 -> schema[3] (profile)
    const schemaMap: Record<number, number> = { 1: 0, 2: 2, 3: 3 };
    return validationSchema[schemaMap[currentStep]];
  }
};

export default function SignUpOverview() {
  const router = useRouter();
  const { clearUserState, signup, loginSocial, setAuthTypes, isLoading } =
    useAuthStore();
  const { clearStoreState } = useBusinessStore();
  const { clearProductState, fetchRegisterOtp } = useProductStore();
  const { singleShippingDetails, fetchGuestShippings } = useShippingStore();
  const { order, getGuestOrdersById, getOrderByIdPublic } = useOrderStore();
  const [step, setStep] = useState<number>(0);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [buttonLoading, setButtonLoading] = useState({
    createAccount: false,
    loginAccount: false,
    exploreMarketplace: false,
  });
  const searchParams = useSearchParams();
  const queryStep = searchParams.get("step");
  // Post-checkout signup carries snake_case params (guest_id / guest_order_id);
  // read those (camelCase fallback) so prefill + guest-order→account linking +
  // the post-signup redirect to order tracking all fire.
  const guestId = searchParams.get("guest_id") || searchParams.get("guestId");
  const orderId = searchParams.get("guest_order_id") || searchParams.get("orderId");
  const prefill = searchParams.get("prefill");
  const [otps, setOtps] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);

  // Referral validation state
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referrerName, setReferrerName] = useState("");
  const refParam = searchParams.get("ref");

  // Auto-advance slides
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slidesData.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (queryStep) {
      setStep(Number(queryStep));
    } else if (prefill === 'true') {
      // Start from step 1 for guest prefill flow
      setStep(1);
    }
  }, [queryStep, prefill]);

  // Fetch guest data for prefilling
  useEffect(() => {
    if (prefill === 'true' && guestId && orderId) {
      console.log("🔄 Fetching guest data for prefill:", { guestId, orderId });
      // Fetch guest shipping details
      if (guestId) {
        fetchGuestShippings(guestId);
      }
      // Fetch order details
      if (orderId) {
        getGuestOrdersById(guestId as string, orderId);
      }
    }
  }, [prefill, guestId, orderId, fetchGuestShippings, getGuestOrdersById]);

  useEffect(() => {
    // Only clear state if not in prefill mode
    if (prefill !== 'true') {
      clearUserState();
      clearStoreState();
      clearProductState();
    }
  }, [prefill]);

  // Update formik values when guest data is loaded
  useEffect(() => {
    if (prefill === 'true' && (singleShippingDetails?.shipping_user || order)) {
      const prefillData = getGuestDataForPrefill();
      if (Object.keys(prefillData).length > 0) {
        console.log("✅ Setting prefill data to formik:", prefillData);
        Object.entries(prefillData).forEach(([key, value]) => {
          if (value) {
            formik.setFieldValue(key, value);
          }
        });
      }
    }
  }, [singleShippingDetails, order, prefill]);

  // Auto-fill referral from URL param or sessionStorage
  useEffect(() => {
    // Store ref param in sessionStorage for persistence
    if (refParam) {
      sessionStorage.setItem('referral_id', refParam);
      formik.setFieldValue('referral_username', refParam);
      // Validate the referral immediately
      validateReferralUsername(refParam);
    } else {
      // Check sessionStorage for previously stored referral
      const storedRef = sessionStorage.getItem('referral_id');
      if (storedRef && !formik.values.referral_username) {
        formik.setFieldValue('referral_username', storedRef);
        validateReferralUsername(storedRef);
      }
    }
  }, [refParam]);

  // Debounced referral validation function
  const validateReferralUsername = async (username: string) => {
    if (!username || username.length < 2) {
      setReferralValid(null);
      setReferrerName("");
      return;
    }

    try {
      const response = await Client({
        path: "/referral/validate",
        method: "POST",
        data: { referral_username: username.replace('@', '') },
      });

      const data = response.data as { data?: { valid?: boolean; referrer_name?: string } };
      if (data?.data?.valid) {
        setReferralValid(true);
        setReferrerName(data.data.referrer_name || "");
      } else {
        setReferralValid(false);
        setReferrerName("");
      }
    } catch (error) {
      console.error("Referral validation error:", error);
      setReferralValid(false);
      setReferrerName("");
    }
  };

  // Handle referral input change with debounce
  const handleReferralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace('@', ''); // Strip @ if pasted
    formik.setFieldValue('referral_username', value);

    // Debounce the validation
    const timeoutId = setTimeout(() => {
      validateReferralUsername(value);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleNextStep = async () => {
    console.log("Form submitted with values:", formik.values);
    console.log("Current step:", step);
    console.log("OTP enabled:", isOtpEnabled);

    // Debug: Check if formik is properly updating
    console.log("Formik touched fields:", formik.touched);
    console.log("Formik errors:", formik.errors);

    const errors = await formik.validateForm();
    console.log("Validation errors:", errors);
    if (Object.keys(errors).length === 0) {
      const maxSteps = isOtpEnabled ? 4 : 3;
      if (step < maxSteps) {
        if (step === 1) {
          const identifier = formik.values.emailPhone;
          try {
            console.log("🔍 Mobile API call initiated to", `${process.env.NEXT_PUBLIC_API_BASE_URL}/validate-email-or-phone`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/validate-email-or-phone`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
              },
              body: JSON.stringify({ identifier }),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            console.log("📱 Mobile API response status:", response.status);

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log("📱 Mobile API response data:", data);

            if (data.data.exists) {
              console.log("✅ Redirecting to sign-in with existing account");
              const signinParams = new URLSearchParams({
                step: '1',  // Route directly to signin form, not landing page
                identifier: identifier,
                type: data.data.type,
                username: data.data.username || '',
                ...(prefill === 'true' && orderId ? { guest_order_id: orderId } : {}),
                ...(prefill === 'true' && guestId ? { guest_id: guestId } : {})
              });
              await router.push(`/signin?${signinParams.toString()}`);
            } else {
              const type = identifier.includes("@") ? "email" : "phone";
              formik.setFieldValue(type === "email" ? "email" : "phoneNumber", identifier);

              // SKIP OTP STEP IF DISABLED VIA FEATURE FLAG
              if (!isOtpEnabled) {
                console.log("🔐 OTP Disabled: Skipping OTP step, using dummy OTP '123456'");
                setOtps("123456"); // Set dummy OTP
                formik.setFieldValue("otp", "123456");
                // Skip directly to password step (which becomes step 2 when OTP is disabled)
                await router.push(`?step=${isOtpEnabled ? 3 : 2}`);
              } else {
                console.log("📱 Calling fetchRegisterOtp...");
                await fetchRegisterOtp({ identifier });
                console.log("✅ Proceeding to OTP step");
                await router.push(`?step=2`);
              }
            }
          } catch (error) {
            console.error("❌ Mobile API call failed:", error);
            const errorMessage = 'Connection failed. Please check your internet and try again.';
            formik.setFieldError('emailPhone', errorMessage);
            trackFormError('signup', 'emailPhone', errorMessage);
          }
        } else if (step === 2 && isOtpEnabled) {
          // Handle OTP step only if enabled
          router.push(`?step=${step + 1}`);
        } else {
          router.push(`?step=${step + 1}`);
        }
      } else if ((!isOtpEnabled && step === 3) || (isOtpEnabled && step === 4)) {
        // Final step - submit signup
        console.log("📝 Final step validation - checking form values:");
        console.log("fullName:", formik.values.fullName);
        console.log("user_name:", formik.values.user_name);
        console.log("phoneNumber:", formik.values.phoneNumber);
        console.log("email:", formik.values.email);

        try {
          await signup(
            {
              phone: formik.values.phoneNumber,
              email: formik.values.email,
              ...splitFullName(formik.values.fullName),
              user_name: formik.values.user_name,
              password: formik.values.passwords,
              auth_type: "email",
              otp: otps || "123456", // Use dummy OTP in local environment
              // Include guest order linking data if available
              ...(prefill === 'true' && orderId ? { guest_order_id: orderId } : {}),
              ...(prefill === 'true' && guestId ? { guest_id: guestId } : {}),
              // Include referral username if provided
              ...(formik.values.referral_username ? { referral_username: formik.values.referral_username } : {}),
            },
            async () => {
              setIsRedirecting(true);

              // Track signup event in Google Analytics
              trackSignUp('email');
              // Set initial user properties for GA4 segmentation
              setUserProperties({
                user_type: 'buyer', // New users start as buyers
                has_store: false,
                signup_date: new Date().toISOString(),
                signup_method: 'email',
              });

              // If this is a guest conversion, redirect to order tracking
              if (prefill === 'true' && orderId) {
                console.log("✅ Guest signup completed, redirecting to order tracking:", orderId);
                router.replace(`/cart/order-confirmed/${orderId}`);
              } else {
                router.replace("/welcome?type=manual");
              }
            }
          );
        } catch (error) {
          console.error("Signup failed:", error);
        }
      }
    } else {
      console.log("Validation errors:", errors);
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

  // Helper function to extract guest data for prefilling
  const getGuestDataForPrefill = () => {
    if (prefill !== 'true') return {};

    let prefillData = {};

    // From shipping profile
    if (singleShippingDetails?.shipping_user) {
      const shippingUser = singleShippingDetails.shipping_user;
      const fullName = `${shippingUser.firstname || ''} ${shippingUser.lastname || ''}`.trim();

      prefillData = {
        fullName: fullName,
        phoneNumber: shippingUser.phone || '',
        email: shippingUser.email || '',
        emailPhone: shippingUser.email || shippingUser.phone || '', // For step 1
      };
    }

    // From order data (fallback or additional data)
    if (order?.shipping_profile_id && typeof order.shipping_profile_id === 'string' && order.shipping_profile_id.includes(',')) {
      // Parse shipping profile data if stored as comma-separated string
      const addressParts = order.shipping_profile_id.split(',');
      // Could extract name/phone from address string if needed
    }

    console.log("🔄 Guest prefill data extracted:", prefillData);
    return prefillData;
  };

  const formik = useFormik({
    initialValues: {
      emailPhone: "",
      email: "",
      otp: "",
      fullName: "",
      user_name: "",
      phoneNumber: "",
      passwords: "",
      confirmPassword: "",
      referral_username: "",
    },
    enableReinitialize: true, // Allow formik to reinitialize when data changes
    // Use validate function instead of validationSchema for dynamic schema selection
    // This ensures the correct schema is always used based on current step
    validate: async (values) => {
      const schema = getSchemaForStep(step, isOtpEnabled);
      if (!schema) return {};
      try {
        await schema.validate(values, { abortEarly: false });
        return {};
      } catch (err: any) {
        const errors: Record<string, string> = {};
        if (err.inner) {
          err.inner.forEach((e: any) => {
            if (e.path && !errors[e.path]) {
              errors[e.path] = e.message;
            }
          });
        }
        return errors;
      }
    },
    onSubmit: handleNextStep,
    validateOnChange: true,
    validateOnBlur: true,
  });

  const handleSocialSignin = async (val: string) => {
    const newVal = val as "google" | "instagram" | "tiktok";
    setAuthTypes(newVal);
    try {
      await loginSocial(newVal, async (data: any) => {
        setIsRedirecting(true);
        // Track social signup in Google Analytics
        trackSignUp(newVal);
        // Set initial user properties for GA4 segmentation
        setUserProperties({
          user_type: 'buyer', // New users start as buyers
          has_store: false,
          signup_date: new Date().toISOString(),
          signup_method: newVal,
        });
      });
    } catch (error: any) {
      console.error("Social signin failed", error);
    }
  };


  // One place for the option -> handler mapping. It previously appeared as an
  // identical nested ternary inside each of the two option blocks.
  const selectAuthOption = (option: AuthOption) => {
    if (option.title === "Create my account") return handleCreateAccountClick();
    if (option.title === "Login to my account") return handleLoginAccountClick();
    if (option.type === "google") return handleSocialSignin(option.type);
    if (option.url) return router.push(option.url);
  };
  const handleCreateAccountClick = async () => {
    setButtonLoading(prev => ({ ...prev, createAccount: true }));
    try {
      await router.push("/signup?step=1");
      // Loading will stop naturally when component unmounts during navigation
    } catch (error) {
      setButtonLoading(prev => ({ ...prev, createAccount: false }));
    }
  };

  const handleLoginAccountClick = async () => {
    setButtonLoading(prev => ({ ...prev, loginAccount: true }));
    try {
      await router.push("/signin?step=1");
      // Loading will stop naturally when component unmounts during navigation
    } catch (error) {
      setButtonLoading(prev => ({ ...prev, loginAccount: false }));
    }
  };

  const handleExploreMarketplaceClick = async () => {
    setButtonLoading(prev => ({ ...prev, exploreMarketplace: true }));
    try {
      await router.push("/shop");
      // Loading will stop naturally when component unmounts during navigation
    } catch (error) {
      setButtonLoading(prev => ({ ...prev, exploreMarketplace: false }));
    }
  };


  return (
    <>
      {isRedirecting ? (
        <Loader />
      ) : (
        <>
          {step === 0 ? (
            <AuthSplitShell
              media={<AnimatedImages currentSlide={currentSlide} />}>
              <SlideContent
                currentSlide={currentSlide}
                onSlideChange={setCurrentSlide}
              />

              <div className="flex flex-col gap-2.5 md:gap-5">
                <ul className="flex flex-col gap-2.5 md:gap-5">
                  {signupOptions.map((option) => {
                    const isLoading =
                      (option.title === "Create my account" && buttonLoading.createAccount) ||
                      (option.title === "Login to my account" && buttonLoading.loginAccount);

                    return (
                      <AuthOptionButton
                        key={option?.title}
                        option={option}
                        loading={isLoading}
                        onSelect={selectAuthOption}
                      />
                    );
                  })}
                </ul>

                <div>
                  <Button
                    onClick={handleExploreMarketplaceClick}
                    loading={buttonLoading.exploreMarketplace}
                    loadingText="Explore Marketplace"
                    variant="bordered"
                    fullWidth={false}
                    className="mx-auto w-full max-w-xs md:max-w-none">
                    <Image
                      src="/icons/shopping_cart.svg"
                      alt=""
                      aria-hidden="true"
                      width={24}
                      height={24}
                    />
                    Explore Marketplace
                  </Button>
                  <p className="mt-3 text-center text-body-sm font-normal text-foreground-secondary md:hidden">
                    Discover Instagram vendors and products
                  </p>
                </div>
              </div>

              <Footer />
            </AuthSplitShell>
          ) : (
            <PageShell
              header={
                <Header
                  onBack={() => {
                    router.back();
                  }}
                  title={<BrandLogo />}
                  progress={<StepNavigation step={!isOtpEnabled && step >= 2 ? step - 1 : step} totalSteps={isOtpEnabled ? 4 : 3} />}
                />
              }
              footerAction={
                <Button
                  onClick={() => {
                    console.log("Continue button clicked - SignUp");
                    if (!isLoading && !formik.isValidating) {
                      formik.handleSubmit();
                    }
                  }}
                  loading={isLoading || formik.isValidating}>
                  Continue
                </Button>
              }>
              <div className="flex flex-col w-full h-full pt-4">
                <div className="flex flex-col w-full flex-1">
                  {step === 1 && (
                    <UserContactForm
                      emailPhone={formik.values.emailPhone}
                      error={formik.errors.emailPhone as string}
                      handleInputChange={formik.handleChange}
                      isGuestPrefill={prefill === 'true'}
                    />
                  )}
                  {/* Only show OTP step if enabled via feature flag */}
                  {step === 2 && isOtpEnabled && (
                    <Otp
                      otp={formik.values.otp}
                      email={formik.values.emailPhone}
                      error={formik.errors.otp as string}
                      setFieldValue={formik.setFieldValue}
                      setOtpValue={setOtps}
                    />
                  )}
                  {/* When OTP disabled, step 2 is password. When enabled, step 3 is password */}
                  {((!isOtpEnabled && step === 2) || (isOtpEnabled && step === 3)) && (
                    <div className="flex flex-col">
                      <H1 className="text-h1 leading-[24px] text-start">
                        Create a Strong Password
                      </H1>
                      <p className="text-body mt-3 tracking-[0.5px] leading-[20px] text-foreground-muted text-start">
                        Choose a unique password that is easy for you to
                        <br />
                        remember but hard for others to guess.{" "}
                      </p>
                      <div className="space-y-4 mt-6">
                        <InputField
                          type="password"
                          name="passwords"
                          value={formik.values?.passwords}
                          onChange={formik.handleChange}
                          placeholder="Password"
                          error={formik.errors.passwords}
                          mode="signin"
                        />
                        <InputField
                          type="password"
                          name="confirmPassword"
                          value={formik.values?.confirmPassword}
                          onChange={formik.handleChange}
                          placeholder="Confirm Password"
                          error={formik.errors.confirmPassword}
                          mode="signin"
                        />
                        {/* Password criteria - shown below Confirm Password */}
                        <PasswordCriteria password={formik.values?.passwords || ""} />
                      </div>
                    </div>
                  )}
                  {/* When OTP disabled, step 3 is profile. When enabled, step 4 is profile */}
                  {((!isOtpEnabled && step === 3) || (isOtpEnabled && step === 4)) && (
                    <UserProfileSetup
                      profileData={formik.values}
                      error={formik.errors}
                      handleInputChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        // Special handling for referral input - trigger validation
                        if (e.target.name === 'referral_username') {
                          const value = e.target.value.replace('@', '');
                          formik.setFieldValue('referral_username', value);
                          // Debounced validation
                          setTimeout(() => validateReferralUsername(value), 500);
                        } else {
                          formik.handleChange(e);
                        }
                      }}
                      handleFileUpload={handleFileUpload}
                      isGuestPrefill={prefill === 'true'}
                      referralValid={referralValid}
                      referrerName={referrerName}
                    />
                  )}
                </div>
              </div>
            </PageShell>
          )}
        </>
      )}
    </>
  );
}