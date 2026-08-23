"use client";
import React, { useState } from "react";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@/design-system/common/Header";
import Button from "@/design-system/common/Button";
import Section from "@/design-system/common/Section";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import InputField from "@/design-system/common/InputField";
import useAuthStore from "@/store/authStore";
import CountryDropDown from "@/design-system/countrydropdown";

const Page = () => {
  const router = useRouter();
  const { user, createShippingAddress, isLoading } = useAuthStore(); // Ensure createShippingAddress is imported
  const [country, setCountry] = useState<string>("Nigeria");

  const formik = useFormik({
    initialValues: {
      town: "",
      street: "",
      country,
      state: "",
    },
    onSubmit: async (values) => {
      const payload = {
        country: country,
        shipping_user: {
          firstname: user?.firstname,
          lastname: user?.lastname,
          phone: user?.phone,
          email: user?.email,
        },
        state: values?.state,
        street: values?.street,
        town: values?.town,
        user_id: user?.id || "",
      };
      createShippingAddress({
        ...payload,
        shipping_user: {
          ...payload.shipping_user,
          firstname: payload.shipping_user.firstname || "",
          lastname: payload.shipping_user.lastname || "",
          email: payload.user_id,
        },
        is_default: false,
      });
    },
  });

  return (
    <PageShell
      header={
        <Header
          showBack
          onBackClick={() => router.back()}
          customText="Enter address manually"
        />
      }
      footerAction={
        <Button type="submit" onClick={formik.handleSubmit} loading={isLoading}>
          Save address
        </Button>
      }>
      <Section className="space-y-4">
        <p>Fill in your address details</p>

        <CountryDropDown setCountry={setCountry} />

        <InputField
          name="town"
          placeholder="Town/City"
          type="text"
          value={formik.values.town}
          onChange={formik.handleChange}
        />

        <InputField
          name="street"
          placeholder="Street"
          type="text"
          value={formik.values.street}
          onChange={formik.handleChange}
        />

        <InputField
          name="state"
          placeholder="State/Province"
          type="text"
          value={formik.values.state}
          onChange={formik.handleChange}
        />
      </Section>
    </PageShell>
  );
};

export default Page;
