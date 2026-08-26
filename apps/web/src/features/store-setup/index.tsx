/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import AddressInput from "./AddressInput";
import StoreDetails from "./StoreDetails";
import { useEffect, useState } from "react";
import useBusinessStore from "@/store/businessStore";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@/design-system/common/Header";
import Image from "next/image";
import Button from "@vibaar/ui/common/Button";
import { ChevronRight } from "@vibaar/ui/icons";
import { useFormik } from "formik";
import * as Yup from "yup";
import { toast } from "sonner";
import Loader from "@vibaar/ui/common/Loader";
import useAuthStore from "@/store/authStore";
import { validatePhoneNumber, validateEmail } from "@/lib/validation";
import {
  trackSellerOnboardingStart,
  trackSellerStoreStep,
  trackSellerSignup,
  startTiming,
  endTiming
} from "@/lib/analytics";

const CreateStore = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addStore, isLoading, store } = useBusinessStore(); // Get store from state
  const { store: myStore } = useBusinessStore((state) => state);
  const searchParams = useSearchParams();
  const queryStep = searchParams.get("step");
  // Initialize step from URL parameter immediately, default to 1 (skip social import)
  const [step, setStep] = useState<number>(queryStep ? Number(queryStep) : 1);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [, setCroppedImage] = useState<boolean>(false);
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [address_line, setAddress] = useState("");
  const [usePersonalContact, setUsePersonalContact] = useState(true);

  useEffect(() => {
    if (queryStep) {
      setStep(Number(queryStep));
    }
  }, [queryStep]);

  // Track seller onboarding start
  useEffect(() => {
    trackSellerOnboardingStart('create_store_page');
    startTiming('seller_onboarding');
  }, []);

  // Updated validation schemas for 2-step flow
  const validationSchemas = [
    // Step 1: Store details
    Yup.object().shape({
      name: Yup.string()
        .required("Store name is required")
        .min(3, "Store name must be at least 3 characters")
        .max(100, "Store name must be less than 100 characters"),
      tag: Yup.string()
        .required("Store handle is required")
        .min(3, "Store handle must be at least 3 characters")
        .max(50, "Store handle must be less than 50 characters"),
      phone: usePersonalContact
        ? Yup.string()
        : Yup.string()
            .required("Phone number is required")
            .test('nigerian-phone', '', (value) => {
              if (!value) return false;
              const error = validatePhoneNumber(value);
              if (error) {
                return new Yup.ValidationError(error, value, 'phone');
              }
              return true;
            }),
      email: usePersonalContact
        ? Yup.string()
        : Yup.string()
            .required("Email is required")
            .test('valid-email', '', (value) => {
              if (!value) return false;
              const error = validateEmail(value);
              if (error) {
                return new Yup.ValidationError(error, value, 'email');
              }
              return true;
            }),
      category: Yup.string().required("Store category is required"),
    }),
    // Step 2: Store address
    Yup.object().shape({
      state: Yup.string().required("State is required"),
    }),
  ];

  const handleNextStep = async () => {
    // Wait for validation to complete
    const errors = await formik.validateForm();

    // Only proceed if there are no errors
    if (Object.keys(errors).length === 0) {
      if (step < 2) {
        // Track step completion
        trackSellerStoreStep(step, step === 1 ? 'store_details' : 'store_address', {
          has_logo: !!logoFile,
          category: formik.values.category,
        });
        router.push(`?step=${step + 1}`);
      } else {
        let storePayload: any;
        
        // If we have a logo file, use FormData, otherwise use JSON
        if (logoFile) {
          const formData = new FormData();
          formData.append("user_id", user?.id || "");
          formData.append("name", formik.values.name);
          formData.append("tag", formik.values.tag);
          formData.append("phone", usePersonalContact ? user?.phone || "" : formik.values.phone);
          formData.append("email", usePersonalContact ? user?.email || "" : formik.values.email);
          formData.append("category", formik.values.category || "");
          formData.append("address[country]", formik.values.country || "Nigeria");
          formData.append("address[province]", formik.values.state || "");
          formData.append("address[address_line]", formik.values.address || "");
          formData.append("business_setting[shipping_amount]", "0");
          formData.append("business_setting[shipping_type]", "INSTASHOP");
          formData.append("logo", logoFile);
          storePayload = formData;
        } else {
          // JSON payload without logo
          storePayload = {
            user_id: user?.id || "",
            name: formik.values.name,
            tag: formik.values.tag,
            phone: usePersonalContact ? user?.phone || "" : formik.values.phone,
            email: usePersonalContact ? user?.email || "" : formik.values.email,
            category: formik.values.category || "",
            address: {
              country: formik.values.country || "Nigeria",
              province: formik.values.state || "",
              address_line: formik.values.address || "",
            },
            business_setting: {
              shipping_amount: 0,
              shipping_type: "INSTASHOP",
            },
          };
        }

        console.log("🔍 Sending business payload:", logoFile ? "FormData with logo" : "JSON without logo");

        // Track final step completion
        trackSellerStoreStep(2, 'store_address', {
          state: formik.values.state,
          country: formik.values.country,
        });

        // Submit form on step 2 (final step)
        await addStore(
          storePayload,
          () => {
            // Track seller signup success
            const onboardingDuration = endTiming('seller_onboarding');
            trackSellerSignup(store?.id || formik.values.tag, formik.values.name);
            if (onboardingDuration) {
              console.log(`Seller onboarding completed in ${onboardingDuration}s`);
            }

            // Store creation success flags
            localStorage.setItem('newStoreCreated', 'true');
            localStorage.setItem('newStoreName', formik.values.name);
            localStorage.setItem('newStoreTag', formik.values.tag);

            // Redirect to dashboard after store creation
            router.push(`/dashboard?newStore=true`);
          }
        );
      }
    } else {
      toast.error("Please correct the highlighted errors before proceeding.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();

      // Handle the file load event
      reader.onload = (event) => {
        const result = event.target?.result;

        if (result) {
          formik.setFieldValue("logo", result);
          setCroppedImage(true);
        }
      };

      // Read the file as Data URL
      reader.readAsDataURL(file);
    }
  };

  const handleBack = () => {
    if (step === 1) {
      // Go to welcome page instead of step 0
      router.push("/welcome");
      return;
    }
    if (step > 1) {
      setStep(step - 1);
      router.push(`?step=${step - 1}`);
    }
  };

  const formik = useFormik({
    initialValues: {
      name: "",
      tag: "",
      phone: "",
      email: "",
      logo: "",
      category: "",
      country: "Nigeria",
      state: "",
      address: "",
    },
    validationSchema: validationSchemas[step - 1],
    onSubmit: handleNextStep,
  });

  // Handle contact toggle - always set form values for validation
  useEffect(() => {
    if (user) {
      if (usePersonalContact) {
        // When toggle is checked, set user data in form for validation
        formik.setFieldValue('email', user.email || '');
        formik.setFieldValue('phone', user.phone || '');
      } else {
        // When toggle is unchecked, prefill with user contact info
        formik.setFieldValue('email', user.email || '');
        formik.setFieldValue('phone', user.phone || '');
      }
    } else if (!usePersonalContact) {
      // When unchecked but no user data, clear fields
      formik.setFieldValue('email', '');
      formik.setFieldValue('phone', '');
    }
  }, [usePersonalContact, user]);

  return step === 3 ? (
    // Success screen — store created
    <PageShell
      footerAction={
        <Button
          onClick={() => {
            localStorage.setItem('newStoreCreated', 'true');
            localStorage.setItem('newStoreName', myStore?.name || '');
            localStorage.setItem('newStoreTag', myStore?.tag || '');
            router.push(`/dashboard?newStore=true`);
          }}>
          Go to Dashboard
          <ChevronRight size={20} className="text-white" />
        </Button>
      }>
      <div className="flex flex-col items-center text-center pt-8">
        <Image
          src="/images/store/store_ready.svg"
          alt="Store ready"
          width={200}
          height={200}
          className="object-contain mb-8"
        />
        <p className="font-bold text-display tracking-wide mb-2">Hurray!!! 🎊</p>
        <p className="font-medium text-display tracking-wide mb-2">
          Your store is ready!
        </p>
        <p className="text-ink-60 text-body px-6 font-medium mt-2">
          Welcome to <span className="text-brand">Vibaar</span>{" "}
          <span className="font-semibold text-ink-90">@{myStore?.name + " "}</span>{" "}
          <br />
          Millions of social shoppers are already waiting, Now publish your first
          product to start selling...
        </p>
      </div>
    </PageShell>
  ) : (
    <PageShell
      header={
        <Header
          showBack
          showStepNavigation
          step={step}
          totalSteps={2}
          customText={`${step === 1
            ? "Enter your store details"
            : step === 2 && "Store address"
            } `}
          onBackClick={handleBack}
        />
      }
      footerAction={
        <Button onClick={handleNextStep} loading={isLoading}>
          {step === 2 ? "Finish setup" : "Continue"}
        </Button>
      }>
      <div className="flex flex-col w-full pt-4">
        {step === 1 && (
          <StoreDetails
            data={formik.values}
            error={formik.errors}
            handleInputChange={formik.handleChange}
            handleFileUpload={handleFileUpload}
            setCategory={(value: string) => {
              setCategory(value);
              formik.setFieldValue('category', value);
            }}
            usePersonalContact={usePersonalContact}
            setUsePersonalContact={setUsePersonalContact}
            user={user}
          />
        )}
        {step === 2 && (
          <AddressInput
            data={formik.values}
            error={formik.errors}
            handleInputChange={formik.handleChange}
            setAddress={(value: string) => {
              setAddress(value);
              formik.setFieldValue('address', value);
            }}
            setCountry={(value: string) => {
              setCountry(value);
              formik.setFieldValue('country', value);
            }}
          />
        )}
      </div>
    </PageShell>
  );
};

export default CreateStore;