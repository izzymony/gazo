"use client";
import React from "react";
import InputField from "@/design-system/common/InputField";
import { useFormik } from "formik";
import * as Yup from "yup";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@/design-system/common/Header";
import Button from "@/design-system/common/Button";
import Section from "@/design-system/common/Section";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/authStore";

/**
 * Change-password screen shared by the buyer (/profile/settings/change-password)
 * and seller (/dashboard/settings/change-password) routes — one form + one
 * changePassword call, each route group supplying its own surrounding shell.
 */
export default function ChangePasswordScreen() {
  const router = useRouter();
  const { changePassword, user } = useAuthStore();

  const formik = useFormik({
    initialValues: {
      oldPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
    validationSchema: Yup.object({
      oldPassword: Yup.string().required("Old Password is required"),
      newPassword: Yup.string()
        .min(6, "New Password must be at least 6 characters")
        .required("New Password is required"),
      confirmNewPassword: Yup.string()
        .oneOf([Yup.ref("newPassword")], "Passwords must match")
        .required("Confirm New Password is required"),
    }),
    onSubmit: async (values) => {
      if (!user?.id) {
        console.error("User ID is required for password change.");
        return;
      }
      await changePassword(
        user.id,
        { old_password: values.oldPassword, new_password: values.newPassword },
        () => {}
      );
    },
  });

  return (
    <PageShell
      header={
        <Header
          showBack
          onBackClick={() => router.back()}
          customText="Change Password"
        />
      }
      footerAction={
        <Button
          type="submit"
          onClick={() => formik.handleSubmit()}
          loading={formik.isSubmitting}>
          Save new password
        </Button>
      }>
      <Section title="Update your password">
        <form onSubmit={formik.handleSubmit} className="flex flex-col space-y-4">
          <InputField
            name="oldPassword"
            placeholder="Old password"
            type="password"
            value={formik.values.oldPassword}
            onChange={formik.handleChange}
            error={formik.errors.oldPassword}
          />
          <InputField
            name="newPassword"
            placeholder="New password"
            type="password"
            value={formik.values.newPassword}
            onChange={formik.handleChange}
            error={formik.errors.newPassword}
          />
          <InputField
            name="confirmNewPassword"
            placeholder="Confirm new password"
            type="password"
            value={formik.values.confirmNewPassword}
            onChange={formik.handleChange}
            error={formik.errors.confirmNewPassword}
          />
        </form>
      </Section>
    </PageShell>
  );
}
