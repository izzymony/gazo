"use client";
import React from "react";
import ResponsiveRouteDialog from "@vibaar/ui/common/ResponsiveRouteDialog";
import PageActionButton from "@vibaar/ui/common/PageActionButton";
import { useRouter } from "next/navigation";
import { AddCardFields, useAddCardForm } from "./addCard";

/**
 * Dialog family 3. The section action on the billing page is only a TRIGGER; the
 * committing Save is this dialog's own CTA, which is why no fifth action
 * placement was needed for it.
 *
 * The Save control keeps the page's exact behaviour, which is to say it keeps
 * doing nothing — see the note in ./addCard. The layout lands; submission does
 * not, and inventing it inside a layout migration is out of scope.
 */
export default function AddCardDialog() {
  const router = useRouter();
  const formik = useAddCardForm();

  return (
    <ResponsiveRouteDialog
      title="Add new card"
      onClose={() => router.back()}
      footer={
        <PageActionButton type="submit" onClick={() => router.push("")}>
          Save Card
        </PageActionButton>
      }>
      <p className="pb-4 text-body-sm text-foreground-secondary">Enter your card details</p>
      <AddCardFields formik={formik} />
    </ResponsiveRouteDialog>
  );
}
