"use client";

import React, { useEffect, useRef, useState } from "react";
import InputField from "@vibaar/ui/common/InputField";
import PageShell from "@vibaar/ui/PageShell";
import PageActionButton from "@vibaar/ui/common/PageActionButton";
import Section from "@vibaar/ui/common/Section";
import { useFormik } from "formik";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/authStore";
import { User } from "@/lib/types";
import UserProfileImage from "@vibaar/ui/common/UserProfileImage";
import { toast } from "sonner";
import * as Yup from "yup";

const Page = () => {
  const { user, updateUser } = useAuthStore();
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [users, setUsers] = useState<User>({});
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (user) {
      console.log("user", user);
      setImage(user.profile_image || null);
      setUsers(user);
    }
  }, [user]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; // Get the selected file
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please select a valid image file");
        return;
      }
      
      setImageFile(file); // Store the file for upload
      
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          setImage(e.target.result as string); // Update the image preview
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Format date for input field (YYYY-MM-DD)
  const formatDateForInput = (dateString?: string): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().split('T')[0];
    } catch {
      return "";
    }
  };

  const validationSchema = Yup.object({
    firstname: Yup.string()
      .min(2, "First name must be at least 2 characters")
      .required("First name is required"),
    lastname: Yup.string()
      .min(2, "Last name must be at least 2 characters")
      .required("Last name is required"),
    user_name: Yup.string()
      .min(3, "Username must be at least 3 characters")
      .required("Username is required"),
    dob: Yup.date()
      .max(new Date(), "Date of birth cannot be in the future")
      .nullable()
  });

  const formik = useFormik({
    initialValues: {
      dob: formatDateForInput(user?.date_of_birth),
      user_name: user?.user_name || "",
      firstname: user?.firstname || "",
      lastname: user?.lastname || "",
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values: {
      firstname?: string;
      lastname?: string;
      user_name?: string;
      dob?: string;
      image?: string;
    }) => {
      console.log("Submitting values:", values);
      setIsUploading(true);
      
      try {
        // Create FormData for image upload if there's a new image
        if (imageFile) {
          const formData = new FormData();
          formData.append('profile_image', imageFile);
          formData.append('firstname', values.firstname || '');
          formData.append('lastname', values.lastname || '');
          formData.append('username', values.user_name || '');
          formData.append('date_of_birth', values.dob || '');
          
          // Use FormData for upload
          await updateUser(formData, () => {
            toast.success("Profile updated successfully!");
            router.back();
          });
        } else {
          // No new image, so profile_image is deliberately OMITTED: the server
          // leaves the stored avatar untouched when the field is absent. Echoing
          // the existing Cloudinary URL back made the server try to base64-decode
          // a URL, which always failed — so anyone who already had an avatar
          // could not save their name or date of birth at all.
          const payload = {
            firstname: values.firstname,
            lastname: values.lastname,
            username: values.user_name,
            date_of_birth: values.dob,
          };
          
          await updateUser(payload, () => {
            toast.success("Profile updated successfully!");
            router.back();
          });
        }
      } catch (error) {
        console.error("Failed to update profile:", error);
        toast.error("Failed to update profile");
      } finally {
        setIsUploading(false);
      }
    },
  });

  return (
    <PageShell
      pageHeader={{
        onBack: () => router.back(),
        title: "Edit Profile",
        actions: (
          <PageActionButton
            type="button"
            onClick={() => formik.handleSubmit()}
            loading={isUploading}>
            Save
          </PageActionButton>
        ),
      }}>
      {/* Avatar (genuine graphic — left as UserProfileImage) */}
      <div
        className="relative flex justify-center items-center cursor-pointer"
        onClick={handleClick}>
        <UserProfileImage
          src={image && image.trim() !== "" ? image : user?.profile_image || null}
          userName={formik.values.user_name || user?.user_name || "User"}
          firstName={formik.values.firstname || user?.firstname}
          lastName={formik.values.lastname || user?.lastname}
          size={100}
          editable={true}
        />
        <input
          type="file"
          id="fileInput"
          ref={fileInputRef}
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleImageChange}
        />
      </div>

      <Section className="space-y-4">
        <InputField
          name="firstname"
          placeholder="First name"
          type="text"
          value={formik.values.firstname}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.firstname && formik.errors.firstname ? formik.errors.firstname : undefined}
        />
        <InputField
          name="lastname"
          placeholder="Last name"
          type="text"
          value={formik.values.lastname}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.lastname && formik.errors.lastname ? formik.errors.lastname : undefined}
        />
        <InputField
          name="user_name"
          placeholder="Username"
          value={formik.values.user_name}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          type="text"
          error={formik.touched.user_name && formik.errors.user_name ? formik.errors.user_name : undefined}
        />
        <InputField
          name="dob"
          placeholder="Date of birth"
          value={formik.values.dob}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          type="date"
          error={formik.touched.dob && formik.errors.dob ? formik.errors.dob : undefined}
        />
      </Section>
    </PageShell>
  );
};

export default Page;