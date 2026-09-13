/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import useAuthStore from "@/store/authStore";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import UserContactForm from "./UserContactForm";
import { signupOptions } from "@/lib/conts";
import AuthOptionButton, { type AuthOption } from "../AuthOptionButton";
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
import useOrderStore from "@/store/orderStore";
import Footer from "@vibaar/ui/common/Footer";
import AnimatedImages from "@vibaar/ui/animated/AnimatedImages";
import AuthSplitShell from "@vibaar/ui/AuthSplitShell";
import SlideContent from "@vibaar/ui/animated/SlideContent";
import { slidesData } from "@vibaar/ui/animated/slidesData";
import { trackLogin, setUserProperties } from "@/lib/analytics";

const validationSchema = Yup.object({
  identifier: Yup.string().required("Email is required"),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .required("Password is required"),
});

export default function SignInOverview() {
  const router = useRouter();
  const { login, loginSocial, setAuthTypes, isLoginLoading, clearUserState } =
    useAuthStore();
  const { clearStoreState } = useBusinessStore();
  const { clearProductState, fetchRecentlyViewedBusiness, fetchWishlist, fetchRegisterOtp } =
    useProductStore();
  const { clearOrderState } = useOrderStore();
  const [step, setStep] = useState<number>(0);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [buttonLoading, setButtonLoading] = useState({
    createAccount: false,
    loginAccount: false,
    exploreMarketplace: false,
  });
  const searchParams = useSearchParams();
  const queryStep = searchParams.get("step");
  const identifierFromQuery = searchParams.get("identifier");
  const typeFromQuery = searchParams.get("type") as "email" | "phone" | null;
  const usernameFromQuery = searchParams.get("username");

  // Check if user came directly from "Login to my account" button
  const isDirectLogin = queryStep === "1" && !identifierFromQuery && !typeFromQuery && !usernameFromQuery;

  useEffect(() => {
    if (queryStep) {
      setStep(Number(queryStep));
    }
  }, [queryStep]);

  useEffect(() => {
    clearUserState();
    clearStoreState();
    clearProductState();
    clearOrderState();
  }, [clearProductState, clearStoreState, clearUserState, clearOrderState]);

  // Auto-advance slides every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slidesData.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleNextStep = async () => {
    const errors = await formik.validateForm();
    if (Object.keys(errors).length === 0) {
      try {
        // Extract guest params from URL
        const guestOrderId = searchParams.get('guest_order_id');
        const guestIdParam = searchParams.get('guest_id');

        await login(
          {
            identifier: formik.values.identifier,
            password: formik.values.password,
            auth_type: "email",
            ...(guestOrderId ? { guest_order_id: guestOrderId } : {}),
            ...(guestIdParam ? { guest_id: guestIdParam } : {}),
          },
          async (data) => {
            if (data) {
              trackLogin('email');
              // Set user properties for GA4 segmentation
              const businessStore = useBusinessStore.getState();
              setUserProperties({
                user_type: businessStore.store?.id ? 'seller' : 'buyer',
                has_store: !!businessStore.store?.id,
                store_id: businessStore.store?.id || null,
                signup_method: 'email',
              });
              // Navigate immediately. The redirect must NOT be gated behind a
              // non-essential prefetch — a slow/failed fetchRecentlyViewedBusiness
              // was stranding users on /signin despite a successful login.
              router.push("/welcome?type=manual");
            }
            // Fire-and-forget: warm the recently-viewed cache without blocking nav.
            fetchRecentlyViewedBusiness().catch(() => {});
          }
        );
      } catch (error) {
        console.error("Signin failed:", error);
      }
    }
  };

  const handleSocialSignin = async (val: string) => {
    const newVal = val as "google" | "instagram" | "tiktok";
    setAuthTypes(newVal);
    try {
      await loginSocial(newVal, async (data: any) => {
        trackLogin(newVal);
        // Set user properties for GA4 segmentation
        const businessStore = useBusinessStore.getState();
        setUserProperties({
          user_type: businessStore.store?.id ? 'seller' : 'buyer',
          has_store: !!businessStore.store?.id,
          store_id: businessStore.store?.id || null,
          signup_method: newVal,
        });
        setIsRedirecting(true);
      });
    } catch (error: any) {
      console.error("Social signin failed ", error);
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
      // Extract guest params from URL
      const guestOrderId = searchParams.get('guest_order_id');
      const guestIdParam = searchParams.get('guest_id');

      // Build signup URL with guest params if available
      const signupParams = new URLSearchParams({
        step: '1',
        ...(guestOrderId ? { guest_order_id: guestOrderId, prefill: 'true' } : {}),
        ...(guestIdParam ? { guest_id: guestIdParam } : {})
      });

      await router.push(`/signup?${signupParams.toString()}`);
      // Loading will stop naturally when component unmounts during navigation
    } catch (error) {
      setButtonLoading(prev => ({ ...prev, createAccount: false }));
    }
  };

  const handleLoginAccountClick = async () => {
    setButtonLoading(prev => ({ ...prev, loginAccount: true }));
    try {
      // Extract guest params from URL
      const guestOrderId = searchParams.get('guest_order_id');
      const guestIdParam = searchParams.get('guest_id');

      // Build signin URL with guest params if available
      const signinParams = new URLSearchParams({
        step: '1',
        ...(guestOrderId ? { guest_order_id: guestOrderId } : {}),
        ...(guestIdParam ? { guest_id: guestIdParam } : {})
      });

      await router.push(`/signin?${signinParams.toString()}`);
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


  const handleIdentifierContinue = async () => {
    const identifier = formik.values.identifier;
    const errors = await formik.validateField("identifier");
    if (errors) return;
    try {
      console.log("🔍 Mobile SignIn API call initiated to", `${process.env.NEXT_PUBLIC_API_BASE_URL}/validate-email-or-phone`);

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
      console.log("📱 Mobile SignIn API response status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📱 Mobile SignIn API response data:", data);

      if (data.data.exists) {
        console.log("✅ Redirecting to sign-in with existing account");
        await router.push(`/signin?identifier=${encodeURIComponent(identifier)}&type=${data.data.type}&username=${encodeURIComponent(data.data.username)}`);
      } else {
        const type = identifier.includes("@") ? "email" : "phone";
        console.log("📱 Calling fetchRegisterOtp...");
        await fetchRegisterOtp({ identifier });
        console.log("✅ Redirecting to signup");
        await router.push(`/signup?step=2&identifier=${encodeURIComponent(identifier)}&type=${type}`);
      }
    } catch (error) {
      console.error("❌ Mobile SignIn identifier check failed:", error);
      formik.setFieldError('identifier', 'Connection failed. Please check your internet and try again.');
    }
  };

  const formik = useFormik({
    initialValues: { identifier: "", password: "" },
    validationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: handleNextStep,
  });

  useEffect(() => {
    if (identifierFromQuery && typeFromQuery) {
      formik.setFieldValue("identifier", identifierFromQuery);
      if (step === 0) {
        router.push(`/signin?step=1&identifier=${encodeURIComponent(identifierFromQuery)}&type=${typeFromQuery}&username=${usernameFromQuery || ''}`);
      }
    }
  }, [identifierFromQuery, typeFromQuery, step, usernameFromQuery]);

  if (isLoginLoading) {
    return <Loader />;
  }

  return (
    <>
      {isRedirecting ? (
        <Loader />
      ) : (
        <>
          {step === 0 ? (
            <AuthSplitShell
              mediaClassName="h-60 sm:h-[500px] md:h-auto"
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
                  onBack={() => router.push(`/signin`)}
                  title={<BrandLogo />}
                  progress={<StepNavigation step={step} totalSteps={2} />}
                />
              }
              footerAction={
                <Button
                  onClick={() => formik.handleSubmit()}
                  loading={isLoginLoading}>
                  Sign in
                </Button>
              }>
              <div className="flex flex-col w-full h-full pt-4">
                <div className="flex flex-col w-full flex-1">
                  {step === 1 && (
                    <UserContactForm
                      identifier={formik.values.identifier}
                      identifierError={formik.errors.identifier}
                      password={formik.values.password}
                      passwordError={formik.errors.password}
                      handleInputChange={formik.handleChange}
                      type={typeFromQuery ?? undefined}
                      username={usernameFromQuery ?? undefined}
                      isDirectLogin={isDirectLogin}
                      onSubmit={() => formik.handleSubmit()}
                    />
                  )}
                </div>
                {/* Position the signup link right before the button area */}
                {step === 1 && (
                  <div className="text-center mb-6 mt-auto">
                    <p className="text-body-sm text-foreground-secondary">
                      Don&apos;t have an account?{" "}
                      <button type="button"
                        className="text-left text-brandDeep font-medium cursor-pointer hover:underline"
                        onClick={() => router.push('/signup?step=1')}
                      >
                        Sign up
                      </button>
                    </p>
                  </div>
                )}
              </div>
            </PageShell>
          )}
        </>
      )}
    </>
  );
}