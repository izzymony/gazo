"use client";
import React, { useEffect } from "react";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import Button from "@vibaar/ui/common/Button";
import Section from "@vibaar/ui/common/Section";
import { Check } from "@vibaar/ui/icons";
import { useRouter, useSearchParams } from "next/navigation";
import InputField from "@vibaar/ui/common/InputField";
import { useFormik } from "formik";
import * as Yup from "yup";
import useAuthStore from "@/store/authStore";
import useShippingStore from "@/store/shippingStore";
import { formatPhoneNumber } from "@/lib/generator";
import LocationModal from "@/hooks/locationmodal";
import { toast } from "sonner";
import { splitFullName } from "@/lib/nameUtils";

const Page = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileId = searchParams.get('id');
  
  const [isLocationModalOpen, setIsLocationModalOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [location, setLocation] = React.useState<any>({});
  
  const { updateShippingAddress, isLoading, user } = useAuthStore();
  const { shippingDetails, selectedDeliveryLocation } = useShippingStore();
  
  // Find the shipping profile to edit
  const profileToEdit = shippingDetails.find(profile => profile.id === profileId);
  
  const formik = useFormik({
    initialValues: {
      fullName: profileToEdit ? 
        `${profileToEdit.shipping_user.firstname} ${profileToEdit.shipping_user.lastname}` : 
        "",
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
    onSubmit: async (values) => {
      const payload = {
        id: profileId,
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
        user_id: user?.id + "",
        is_default: profileToEdit?.is_default || false,
      };
      
      try {
        await updateShippingAddress(profileId ?? "", payload);
        toast.success("Shipping profile updated successfully!");
        router.replace("/profile/shipping-address");
      } catch (error) {
        toast.error("Failed to update shipping profile");
        console.error("Update error:", error);
      }
    },
  });

  const handleSubmit = async () => {
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
      router.replace("/profile/shipping-address");
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

  if (!profileToEdit) {
    return null; // or a loading spinner
  }

  return (
    <PageShell
      header={
        <Header
          onBack={() => router.back()}
          title="Edit shipping profile"
        />
      }
      footerAction={
        <Button type="button" onClick={handleSubmit} loading={isLoading}>
          Update shipping profile
        </Button>
      }>
      <div className="space-y-1">
        <p className="font-medium text-h1">Edit shipping profile</p>
        <p className="text-body font-normal text-foreground-secondary">
          Your order and delivery updates will be sent to the contact
          information below.
        </p>
      </div>

      <Section className="space-y-4">
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
            className="bg-surface-muted"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-6 h-6 rounded-full bg-success-foreground flex items-center justify-center">
              <Check size={16} className="text-white" />
            </div>
          </div>
        </div>
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
            error={formik.errors?.houseAddress}
            isReadonly={true}
            className="cursor-pointer"
          />
        </div>
      </Section>

      <LocationModal
        isLocationModalOpen={isLocationModalOpen}
        closeLocationModal={() => setIsLocationModalOpen(false)}
        setLoading={setLoading}
        setLocation={setLocation}
        location={location}
        setAddress={(address: string) => {
          formik.setFieldValue('houseAddress', address);
          // Try to extract state and town from address
          const addressParts = address.split(',').map(part => part.trim());
          if (addressParts.length > 1) {
            // Assume second-to-last part is state
            const possibleState = addressParts[addressParts.length - 2];
            if (possibleState && possibleState.toLowerCase().includes('lagos')) {
              formik.setFieldValue('state', 'Lagos');
            } else if (possibleState) {
              formik.setFieldValue('state', possibleState);
            }
            // Use first part as town if available
            if (addressParts.length > 2) {
              formik.setFieldValue('town', addressParts[0]);
            }
          }
        }}
      />
    </PageShell>
  );
};

export default Page;
