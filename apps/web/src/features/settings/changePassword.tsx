"use client";

import React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import InputField from "@vibaar/ui/common/InputField";
import useAuthStore from "@/store/authStore";

/**
 * The change-password form, split from its screen so that the same fields, the
 * same schema and the same one `changePassword` call serve three surfaces: the
 * canonical buyer route, the canonical seller route, and the desktop dialog the
 * seller route is intercepted by.
 *
 * SPLIT AS A HOOK PLUS FIELDS, NOT AS A COMPONENT WITH A FOOTER PROP. The commit
 * button has to render in a different DOM position on each surface — the shell's
 * action bar on one, a dialog footer that must not scroll on another — while
 * reading the same `isSubmitting`. A component owning both would have to accept
 * the button and place it, which is the shell's job, not the form's.
 *
 * `form` is wired by id rather than by nesting: the attribute is
 * document-scoped, so a submit button outside the `<form>` still submits it, and
 * Enter inside any field still works. That is what keeps ONE button across the
 * two layouts instead of one inside the form and one in the footer.
 */
export const CHANGE_PASSWORD_FORM_ID = "change-password";

export function useChangePasswordForm(onSuccess?: () => void) {
  const { changePassword, user } = useAuthStore();

  return useFormik({
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
        // The canonical screen passed an empty callback and stayed put. The
        // dialog needs to dismiss itself, so the callback is a parameter now —
        // and stays empty where it always was.
        () => onSuccess?.()
      );
    },
  });
}

type Formik = ReturnType<typeof useChangePasswordForm>;

export function ChangePasswordFields({ formik }: { formik: Formik }) {
  return (
    <form
      id={CHANGE_PASSWORD_FORM_ID}
      onSubmit={formik.handleSubmit}
      className="flex flex-col space-y-4">
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
  );
}
