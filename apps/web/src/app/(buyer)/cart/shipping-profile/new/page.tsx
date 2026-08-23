"use client";
import React from "react";
import PageShell from "@/design-system/PageShell";
import Header from "@/design-system/common/Header";
import Button from "@/design-system/common/Button";
import { Check } from "@/design-system/icons";
import { useRouter, useSearchParams } from "next/navigation";
import InputField from "@/design-system/common/InputField";
import { useFormik } from "formik";
import * as Yup from "yup";
import useAuthStore from "@/store/authStore";
import useShippingStore from "@/store/shippingStore";
import { formatPhoneNumber } from "@/lib/generator";
// import CountryDropDown from "@/design-system/countrydropdown";
import LocationModal from "@/hooks/locationmodal";
import { splitFullName } from "@/lib/nameUtils";
// import useAddressHook from "@/hooks/useAddresshook";

const Page = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if coming from profile (detect based on referrer or URL params)
  const fromProfile = searchParams.get('from') === 'profile' ||
    (typeof window !== 'undefined' && document.referrer.includes('/profile'));

  // const [country, setCountry] = React.useState<string>("Nigeria");
  const [isLocationModalOpen, setIsLocationModalOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [location, setLocation] = React.useState<any>({});
  // const { input, inputRef } = useAddressHook();
  const { createShippingAddress, createGuestShippingAddress, isLoading, user } =
    useAuthStore();
  const { ensureGuestId, selectedDeliveryLocation, setSingleShippingDetails } =
    useShippingStore();
  // Guests have no user → don't let `undefined + ""` prefill the string
  // "undefined" (which is non-empty, so it slips past `required`).
  const fullname = user
    ? `${user.firstname ?? ""} ${user.lastname ?? ""}`.trim()
    : "";
  const phone = user?.phone ? formatPhoneNumber(user.phone) : "";
  const formik = useFormik({
    initialValues: {
      fullName: fullname,
      phoneNumber: phone,
      Email: user?.email ?? "",
      countryRegion: "Nigeria",
      state: selectedDeliveryLocation?.state || user?.state || "",
      town: selectedDeliveryLocation?.town || user?.state || "",
      houseAddress: selectedDeliveryLocation?.full_address || user?.address || "",
    },
    validationSchema: Yup.object({
      fullName: Yup.string().trim().required("Full name is required"),
      phoneNumber: Yup.string()
        .trim()
        .required("Phone number is required")
        .min(10, "Enter a valid phone number"),
      Email: Yup.string()
        .trim()
        .required("Email is required")
        .email("Enter a valid email"),
      countryRegion: Yup.string().required("Country/region is required"),
      houseAddress: Yup.string()
        .trim()
        .required("Please select your delivery address"),
    }),
    onSubmit: async (values) => {
      const payload = {
        country: values?.countryRegion,
        shipping_user: {
          ...splitFullName(values.fullName),
          phone: formatPhoneNumber(values.phoneNumber),
          email: values.Email,
        },
        state: values?.state,
        street: values?.houseAddress,
        houseAddress: values?.houseAddress,
        town: values?.town,
        user_id: formatPhoneNumber(values.phoneNumber),
        is_default: false,
      };
      //(payload);
      if (user) {
        //("using user shipping");
        return createShippingAddress(
          {
            ...payload,
          },
          (created?: any) => {
            if (fromProfile) {
              router.replace("/profile/shipping-address");
            } else {
              // Reconcile: ship to the address just confirmed here (P2).
              if (created) setSingleShippingDetails(created);
              router.replace("/cart/complete-order/review");
            }
          }
        );
      } else {
        //("using guest shipping");
        return createGuestShippingAddress(
          {
            ...payload,
          },
          ensureGuestId(),
          (created?: any) => {
            if (fromProfile) {
              router.replace("/profile/shipping-address");
            } else {
              // Reconcile: ship to the address just confirmed here (P2).
              if (created) setSingleShippingDetails(created);
              router.replace("/cart/complete-order/review");
            }
          }
        );
      }
    },
  });

  // Pull the buyer's real state / town / country from Google's structured
  // address_components (the canonical names) instead of guessing from the
  // formatted string. Only free-text manual entries carry no components — those
  // fall back to a best-effort split of the typed address.
  const applyStructuredAddress = async (loc: {
    address_components?: { long_name?: string; types?: string[] }[];
    properties?: { full_address?: string };
  }) => {
    const comps = loc?.address_components ?? [];
    if (comps.length > 0) {
      const pick = (type: string) =>
        comps.find((c) => c?.types?.includes(type))?.long_name;
      const state = pick("administrative_area_level_1");
      const town =
        pick("locality") ||
        pick("administrative_area_level_2") ||
        pick("sublocality_level_1");
      const country = pick("country");
      if (state) formik.setFieldValue("state", state);
      if (town) formik.setFieldValue("town", town);
      if (country) formik.setFieldValue("countryRegion", country);
      return;
    }
    // Manual entry (no structured data) — best-effort from the typed string.
    const parts = (loc?.properties?.full_address ?? "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 1) {
      const guess = parts[parts.length - 2];
      formik.setFieldValue("state", /lagos/i.test(guess) ? "Lagos" : guess);
      if (parts.length > 2) formik.setFieldValue("town", parts[0]);
    }
  };

  const handleSubmit = async () => {
    // The footer button calls this directly (not formik.handleSubmit), so run
    // the schema here — otherwise an empty phone/email or an unselected address
    // sails straight through. Block + surface the field errors on failure.
    const errors = await formik.validateForm();
    if (Object.keys(errors).length > 0) {
      formik.setTouched({
        fullName: true,
        phoneNumber: true,
        Email: true,
        houseAddress: true,
      });
      return;
    }
    const payload = {
      country: formik.values?.countryRegion,
      shipping_user: {
        ...splitFullName(formik.values.fullName),
        phone: formatPhoneNumber(formik.values.phoneNumber),
        email: formik.values.Email,
      },
      // Forward the buyer's REAL state (parsed from the selected address by the
      // LocationModal), not a hardcoded "lagos" — this is what lets the backend
      // resolve the delivery zone (local / interstate / international) correctly.
      state: formik.values?.state || "",
      street: formik.values?.houseAddress,
      houseAddress: formik.values?.houseAddress,
      town: formik.values?.town || formik.values?.houseAddress,
      user_id: user?.id
        ? user?.id + ""
        : formatPhoneNumber(formik.values.phoneNumber),
      is_default: false,
    };
    // Select the just-created profile so review ships to THIS address (the one
    // the buyer confirmed here), not shippingDetails[0] (P2 reconciliation).
    const goToReview = (created?: any) => {
      if (created) setSingleShippingDetails(created);
      router.replace("/cart/complete-order/review");
    };
    if (user) {
      //("using user shipping");
      return createShippingAddress({ ...payload }, goToReview);
    } else {
      //("using guest shipping");
      return createGuestShippingAddress({ ...payload }, ensureGuestId(), goToReview);
    }
  };

  return (
    <PageShell
      header={
        <Header
          showBack
          customText="Add shipping profile"
          onBackClick={() => router.back()}
        />
      }
      footerAction={
        <Button onClick={handleSubmit} loading={isLoading}>
          Add shipping profile
        </Button>
      }>
      <div className="w-full pt-4">
        <p className="font-medium text-h1">Add shipping profile</p>
        <p className="text-body font-normal text-ink-60">
          Your order and delivery updates will be sent to the contact
          information below.
        </p>

        <div className="space-y-4 mt-5">
          <InputField
            type="text"
            name="fullName"
            value={formik.values.fullName}
            onChange={formik.handleChange}
            placeholder="Full name"
            error={formik.errors?.fullName}
          />
          <InputField
            type="text"
            name="phoneNumber"
            value={formik.values.phoneNumber}
            onChange={formik.handleChange}
            placeholder="Phone number"
            error={formik.errors?.phoneNumber}
          />
          <InputField
            type="text"
            name="Email"
            value={formik.values.Email}
            onChange={formik.handleChange}
            placeholder="Email"
            error={formik.errors?.Email}
          />
          <div className="relative">
            <InputField
              type="text"
              name="countryRegion"
              value="Nigeria"
              isReadonly={true}
              placeholder="Country"
              className="bg-ink-5"
              onChange={() => {}}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-6 h-6 rounded-full bg-green flex items-center justify-center">
                <Check size={14} className="text-white" strokeWidth={2.5} />
              </div>
            </div>
          </div>
          {/* <InputField
            type="text"
            name="state"
            value={formik.values.state}
            onChange={formik.handleChange}
            placeholder="State"
            error={formik.errors?.state}
          />
          <InputField
            type="text"
            name="town"
            value={formik.values.town}
            onChange={formik.handleChange}
            placeholder="town"
          /> */}
          <div
            onClick={() => setIsLocationModalOpen(true)}
            className="cursor-pointer"
          >
            <InputField
              type="text"
              name="houseAddress"
              value={formik.values.houseAddress}
              onChange={formik.handleChange}
              placeholder="Tap to select address"
              error={formik.errors?.houseAddress as string | undefined}
              isReadonly={true}
              className="cursor-pointer"
            />
          </div>
        </div>
      </div>

      <LocationModal
        isLocationModalOpen={isLocationModalOpen}
        closeLocationModal={() => setIsLocationModalOpen(false)}
        setLoading={setLoading}
        setLocation={setLocation}
        location={location}
        callback={applyStructuredAddress}
        setAddress={(address: string) =>
          formik.setFieldValue("houseAddress", address)
        }
      />
    </PageShell>
  );
};

export default Page;
