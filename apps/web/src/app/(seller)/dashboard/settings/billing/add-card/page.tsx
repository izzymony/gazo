/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React from "react";
import InputField from "@vibaar/ui/common/InputField";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useRouter } from "next/navigation";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import Button from "@vibaar/ui/common/Button";
import Section from "@vibaar/ui/common/Section";

const Page = () => {
  const router = useRouter();
  const formik = useFormik({
    initialValues: {
      cardNumber: "",
      expiryDate: "",
      CVV: "",
      nameOnCard: "",
    },
    validationSchema: Yup.object({
      cardNumber: Yup.string().required("Card number is required"),
      expiryDate: Yup.string().required("Expiry date is required"),
      nameOnCard: Yup.string().required("Name is required"),
      CVV: Yup.string()
        .matches(/^\d{1,3}$/, "CVV must be a number and not more than 3 digits")
        .required("CVV is required"),
    }),
    onSubmit: (values) => {
      //(values);
    },
  });

  return (
    <PageShell
      header={
        <Header
          onBack={() => router.back()}
          title="Add new card"
        />
      }
      footerAction={
        <Button type="submit" onClick={() => router.push("")}>
          Save Card
        </Button>
      }>
      {/* Form */}
      <Section title="Enter your card details">
        <form
          onSubmit={formik.handleSubmit}
          className="flex flex-col space-y-4">
            <InputField
              name="cardNumber"
              placeholder="Card number"
              type="text"
              value={formik.values.cardNumber}
              onChange={formik.handleChange}
              error={formik.errors.cardNumber}
            />
            <InputField
              name="expiryDate"
              placeholder="Expiry date"
              type="text"
              value={formik.values.expiryDate}
              onChange={formik.handleChange}
              error={formik.errors.expiryDate}
            />
            <InputField
              name="CVV"
              placeholder="CVV"
              type="text"
              value={formik.values.CVV}
              onChange={formik.handleChange}
              error={formik.errors.CVV}
            />
            <InputField
              name="nameOnCard"
              placeholder="Name on card"
              type="text"
              value={formik.values.nameOnCard}
              onChange={formik.handleChange}
              error={formik.errors.nameOnCard}
            />
          </form>
      </Section>
    </PageShell>
  );
};

export default Page;
