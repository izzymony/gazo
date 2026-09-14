/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import useAuthStore from "@/store/authStore";
import useShippingStore from "@/store/shippingStore";
import { formatPhoneNumber } from "@/lib/generator";
import { splitFullName } from "@/lib/nameUtils";
import {
  AddressPickerField,
  ContactFields,
  CountryLockedField,
  applyLooseAddress,
} from "./AddressFields";

/**
 * Editing a saved shipping profile — dialog family 6.
 *
 * Split from its screen so the canonical route and the intercepted dialog share
 * one schema, one set of seven questions and one update call. The questions are
 * unchanged: full name, phone, email, country, and the picked address (with
 * state and town derived from it). Nothing was added or removed to make it
 * shareable with the four-field create form — the two ask different things and
 * are allowed to.
 */
export function useEditShippingProfile(
  /**
   * Where a successful update goes. The canonical page returns to the list; the
   * dialog unwinds its own interception instead, because replacing the route
   * underneath leaves the panel mounted on top of it — the modal slot only
   * clears on `router.back()`, which here lands on the same list anyway.
   */
  onDone?: () => void
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileId = searchParams.get("id");

  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<any>({});

  const { updateShippingAddress, isLoading, user } = useAuthStore();
  const { shippingDetails } = useShippingStore();

  const profileToEdit = shippingDetails.find((profile) => profile.id === profileId);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      fullName: profileToEdit
        ? `${profileToEdit.shipping_user.firstname} ${profileToEdit.shipping_user.lastname}`
        : "",
      phoneNumber: profileToEdit?.shipping_user.phone || "",
      Email: profileToEdit?.shipping_user.email || "",
      countryRegion: profileToEdit?.country || "Nigeria",
      state: profileToEdit?.state || "",
      town: profileToEdit?.town || "",
      houseAddress: profileToEdit?.street || "",
    },
    validationSchema: Yup.object({
      fullName: Yup.string().required("Full name required"),
      phoneNumber: Yup.string().required("Phone number required"),
      Email: Yup.string().required("Email required"),
      countryRegion: Yup.string().required("Country/region required"),
      state: Yup.string().required("State required"),
      houseAddress: Yup.string().required("House address required"),
    }),
    onSubmit: async () => {
      await submit();
    },
  });

  const submit = async () => {
    const payload = {
      id: profileId,
      country: formik.values?.countryRegion,
      shipping_user: {
        ...splitFullName(formik.values.fullName),
        phone: formatPhoneNumber(formik.values.phoneNumber),
        email: formik.values.Email,
      },
      state: formik.values?.state,
      street: formik.values?.houseAddress,
      houseAddress: formik.values?.houseAddress,
      town: formik.values?.town,
      user_id: user?.id + "",
      is_default: profileToEdit?.is_default || false,
    };

    try {
      await updateShippingAddress(profileId ?? "", payload);
      toast.success("Shipping profile updated successfully!");
      if (onDone) onDone();
      else router.replace("/profile/shipping-address");
    } catch (error) {
      toast.error("Failed to update shipping profile");
      console.error("Update error:", error);
    }
  };

  // Redirect if no profile found
  useEffect(() => {
    if (!profileToEdit && profileId) {
      toast.error("Shipping profile not found");
      router.replace("/profile/shipping-address");
    }
  }, [profileToEdit, profileId, router]);

  return {
    formik,
    submit,
    isLoading,
    profileToEdit,
    isLocationOpen,
    setIsLocationOpen,
    loading,
    setLoading,
    location,
    setLocation,
    onAddressPicked: (address: string) => applyLooseAddress(formik, address),
  };
}

type Machine = ReturnType<typeof useEditShippingProfile>;

export function EditShippingProfileFields({ machine }: { machine: Machine }) {
  return (
    <>
      <ContactFields formik={machine.formik} />
      <CountryLockedField />
      <AddressPickerField
        formik={machine.formik}
        onPick={() => machine.setIsLocationOpen(true)}
      />
    </>
  );
}
