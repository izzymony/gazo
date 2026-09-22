"use client";
import React from "react";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import Button from "@vibaar/ui/common/Button";
import Section from "@vibaar/ui/common/Section";
import { useRouter } from "next/navigation";
import {
  CHANGE_PASSWORD_FORM_ID,
  ChangePasswordFields,
  useChangePasswordForm,
} from "./changePassword";

/**
 * The CANONICAL change-password screen, shared by the buyer
 * (/profile/settings/change-password) and seller
 * (/dashboard/settings/change-password) routes.
 *
 * It is also the direct-URL and hard-refresh fallback for the seller dialog: a
 * navigation from within settings is intercepted and opens as a dialog, but a
 * pasted link or a reload renders THIS. Its desktop action comes from the shell's
 * constrained inline-right fallback, so the fallback is never the old fixed
 * footer — which is the property that makes the dialog convention safe to paste
 * a URL into.
 */
export default function ChangePasswordScreen() {
  const router = useRouter();
  const formik = useChangePasswordForm();

  return (
    <PageShell
      header={
        <Header
          onBack={() => router.back()}
          title="Change Password"
        />
      }
      footerAction={
        <Button
          type="submit"
          form={CHANGE_PASSWORD_FORM_ID}
          loading={formik.isSubmitting}>
          Save new password
        </Button>
      }>
      <Section title="Update your password">
        <ChangePasswordFields formik={formik} />
      </Section>
    </PageShell>
  );
}
