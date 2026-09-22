"use client";

import React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import InputField from "@vibaar/ui/common/InputField";

/**
 * The add-card form, split from its screen so the canonical route and the
 * intercepted dialog share one schema and one set of fields. Same shape as
 * `features/settings/changePassword`.
 *
 * ⚠️ SUBMISSION IS BROKEN AND IS DELIBERATELY LEFT BROKEN. `onSubmit` has an
 * empty body behind a full card-validation schema, and the Save control is a
 * `type="submit"` button that sits OUTSIDE the form with no `form` attribute —
 * so it never submits it and only runs `router.push("")`, which navigates
 * nowhere. Entering a valid card and pressing Save does nothing, and has done
 * nothing for as long as the screen has existed.
 *
 * This work moves the layout and must not invent payment behaviour to do it, so
 * the defect is carried across verbatim rather than quietly patched into
 * something that looks like it works. Notably the button is NOT wired with
 * `form="add-card"` here, which would have been the tidy thing to do and would
 * have started firing a submit handler that does nothing with a card number.
 */
export const ADD_CARD_FORM_ID = "add-card";

export function useAddCardForm() {
  return useFormik({
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
      // Preserved defect — see the note above. Do not fill this in as part of a
      // layout change.
    },
  });
}

type Formik = ReturnType<typeof useAddCardForm>;

export function AddCardFields({ formik }: { formik: Formik }) {
  return (
    <form id={ADD_CARD_FORM_ID} onSubmit={formik.handleSubmit} className="flex flex-col space-y-4">
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
  );
}
