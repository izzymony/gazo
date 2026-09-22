"use client";

import React from "react";
import InputField from "@vibaar/ui/common/InputField";
import { Check } from "@vibaar/ui/icons";

/**
 * Shared address-field primitives.
 *
 * SHARED FIELDS, NOT A SHARED FORM. The three address surfaces genuinely ask
 * different questions — create asks four, edit asks seven, checkout asks its own
 * set and posts to a different place — and a single component with a `mode` flag
 * would have had to pick a winner. Consolidating the FIELDS removes the copied
 * markup, the drifting placeholders and the three spellings of the locked-country
 * row, while leaving each context free to ask exactly what it asks today.
 *
 * Nothing here owns routing, submission or validation. Each context keeps its own
 * formik instance and its own submit destination, and passes it in.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyFormik = {
  values: Record<string, any>;
  errors: Record<string, any>;
  handleChange: (e: any) => void;
  setFieldValue: (field: string, value: any) => void;
};

/** Name, phone and email — the three the edit and checkout contexts ask for. */
export function ContactFields({ formik }: { formik: AnyFormik }) {
  return (
    <>
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
    </>
  );
}

/**
 * The country row, which is not a choice: the platform ships within Nigeria, so
 * this is a locked field with a confirmation tick rather than a select that has
 * one option. Two screens had drawn it by hand with different tick sizes.
 */
export function CountryLockedField() {
  return (
    <div className="relative">
      <InputField
        type="text"
        name="countryRegion"
        value="Nigeria"
        isReadonly={true}
        placeholder="Country"
        className="bg-surface-muted"
        onChange={() => {}}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        <div className="w-6 h-6 rounded-full bg-success-foreground flex items-center justify-center">
          <Check size={14} className="text-white" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}

/**
 * The address itself — a read-only input that hands off to the location picker.
 * `onPick` is the caller's, because WHERE the picker appears differs by context:
 * a bottom sheet on a full page, a step inside the panel in a dialog. This field
 * never opens one itself.
 */
export function AddressPickerField({
  formik,
  onPick,
}: {
  formik: AnyFormik;
  onPick: () => void;
}) {
  return (
    <InputField
      type="drop"
      name="houseAddress"
      value={formik.values.houseAddress}
      onChange={formik.handleChange}
      placeholder="Tap to select address"
      error={formik.errors?.houseAddress as string | undefined}
      drops
      dropAction={onPick}
    />
  );
}

/**
 * Best-effort state/town from a free-text address, used when the picker returns
 * no structured components. Lifted out of two screens that had written it twice
 * with the same Lagos special-case and different variable names.
 */
export function applyLooseAddress(formik: AnyFormik, address: string) {
  formik.setFieldValue("houseAddress", address);
  const parts = address.split(",").map((p) => p.trim());
  if (parts.length > 1) {
    const guess = parts[parts.length - 2];
    if (guess) formik.setFieldValue("state", /lagos/i.test(guess) ? "Lagos" : guess);
    if (parts.length > 2) formik.setFieldValue("town", parts[0]);
  }
}
