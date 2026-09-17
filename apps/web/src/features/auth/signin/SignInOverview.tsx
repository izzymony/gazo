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
import { resolveAuthStep } from "../authSteps";
import useStepFocus from "../useStepFocus";
import usePrefersReducedMotion from "@vibaar/ui/common/usePrefersReducedMotion";

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

  // Only audited-live steps enter the split. `step > 0` would sweep in
  // /signin?step=2 and any non-numeric step, which render a header, a progress
  // bar and a live CTA over an empty column — dressing a broken URL as a
  // finished screen is not this change's job.
  //
  // Declared here, above the slideshow effect that reads it, rather than beside
  // the render. It is a pure function of `step`, so the position is free.
  const liveStep = resolveAuthStep("signin", step);

  // Auto-advance slides, but only while slides are actually on screen.
  //
  // This effect used to have `[]` deps and no guard, and it is declared above
  // every early return — so it ticked in 11 of the 14 auth states this file can
  // render: behind the `isLoginLoading` spinner, behind `isRedirecting`, on
  // `/signin?step=2` (which renders no media at all), and on `?step=1` on a
  // phone, where `mediaOn="desktop"` means the pane is never mounted. Each tick
  // is a `setState` on this component, so it re-rendered four Zustand stores,
  // Formik and the whole form subtree every 8 seconds with nothing observing
  // the value.
  //
  // `slideshowVisible` is the one state that shows slides: the landing, not
  // redirecting, not loading. `SlideContent` is rendered only under
  // `liveStep === 0` too, so this now matches what is on screen.
  // Reduced motion also stops the ADVANCE, which no CSS rule can do: a
  // slideshow that keeps changing content on its own is motion, whatever
  // the transition duration is. The dots stay live, so the narrative is
  // still reachable — it just waits to be asked for.
  const reducedMotion = usePrefersReducedMotion();
  const slideshowVisible =
    liveStep === 0 && !isRedirecting && !isLoginLoading && !reducedMotion;

  useEffect(() => {
    if (!slideshowVisible) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slidesData.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [slideshowVisible]);

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

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.data.exists) {
        await router.push(`/signin?identifier=${encodeURIComponent(identifier)}&type=${data.data.type}&username=${encodeURIComponent(data.data.username)}`);
      } else {
        const type = identifier.includes("@") ? "email" : "phone";
        await fetchRegisterOtp({ identifier });
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

  const stepRef = useStepFocus(liveStep);

  if (isLoginLoading) {
    return <Loader />;
  }

  return (
    <>
      {isRedirecting ? (
        <Loader />
      ) : liveStep === null ? (
        // Not a state this migration audited — keep today's presentation
        // exactly, rather than giving an empty column a desktop media panel.
        <PageShell
          header={
            <Header
              onBack={() => router.push(`/signin`)}
              title={<BrandLogo />}
              progress={<StepNavigation step={step} totalSteps={2} />}
            />
          }
          footerAction={<Button
                  onClick={() => formik.handleSubmit()}
                  loading={isLoginLoading}>
                  Sign in
                </Button>}>
          <div className="flex flex-col w-full h-full pt-4" />
        </PageShell>
      ) : (
        <AuthSplitShell
          media={<AnimatedImages currentSlide={currentSlide} />}
          // The landing shows its artwork on both widths; a form step shows it
          // on desktop only, and does not mount it at all on mobile.
          mediaOn={liveStep === 0 ? "always" : "desktop"}
          actionMode={liveStep === 0 ? "landing" : "step"}
          header={
            liveStep > 0 ? (
              // `md:static lg:static`, not `md:static` alone: Header is
              // `absolute lg:sticky lg:top-0`, and responsive variants are
              // independent — without the `lg` term it would go sticky again at
              // 1024 and, being `w-full z-sticky`, paint over the media pane.
              <Header
                  className="md:static lg:static"
                  onBack={() => router.push(`/signin`)}
                  title={<BrandLogo />}
                  progress={<StepNavigation step={step} totalSteps={2} />}
                />
            ) : undefined
          }
          footerAction={liveStep > 0 ? <Button
                  onClick={() => formik.handleSubmit()}
                  loading={isLoginLoading}>
                  Sign in
                </Button> : undefined}>
          {liveStep === 0 ? (
            <>
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
                    variant="ghost"
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
            </>
          ) : (
            <div ref={stepRef} className="contents">
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
                {/* Sits just above the action bar, and close to it — this line
                    belongs to the CTA, not to the form above it.

                    `pt-6` rather than a top margin: `mt-auto` is what pushes it
                    down on mobile, and a margin would fight it. No bottom
                    margin: the gap to the button is already the 24px the
                    wrapper's `space-y-6` gives the bar plus the Button's own
                    `mt-4`, and a third 24px on top of those read as a break
                    between two unrelated things. */}
                {step === 1 && (
                  <div className="text-center mt-auto pt-6">
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
            </div>
          )}
        </AuthSplitShell>
      )}
    </>
  );
}
