"use client";
import React from "react";
import ResponsiveRouteDialog from "@vibaar/ui/common/ResponsiveRouteDialog";
import PageActionButton from "@vibaar/ui/common/PageActionButton";
import { useRouter } from "next/navigation";
import {
  CHANGE_PASSWORD_FORM_ID,
  ChangePasswordFields,
  useChangePasswordForm,
} from "./changePassword";

/**
 * The seller's change-password flow as the desktop dialog its row opens, and as
 * the same full-screen form on a phone.
 *
 * `router.back()` rather than `router.push` for both the close control and the
 * success path: the dialog exists because a route was pushed, so unwinding that
 * push is what closes it — and it leaves the history stack where the browser's
 * own Back button agrees with the X.
 */
export default function ChangePasswordDialog() {
  const router = useRouter();
  const formik = useChangePasswordForm(() => router.back());

  return (
    <ResponsiveRouteDialog
      title="Change Password"
      onClose={() => router.back()}
      footer={
        <PageActionButton
          type="submit"
          form={CHANGE_PASSWORD_FORM_ID}
          loading={formik.isSubmitting}>
          Save new password
        </PageActionButton>
      }>
      <p className="pb-4 text-body-sm text-foreground-secondary">Update your password</p>
      <ChangePasswordFields formik={formik} />
    </ResponsiveRouteDialog>
  );
}
