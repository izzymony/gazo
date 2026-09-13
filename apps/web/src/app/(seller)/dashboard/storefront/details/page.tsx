"use client";

import React, { useState, useEffect } from "react";
import InputField from "@vibaar/ui/common/InputField";
import {
  ChevronRight,
  Edit,
  FaInstagram,
  FaTiktok,
  FaFacebook,
  FaWhatsapp,
  FaXTwitter,
  type IconProps,
} from "@vibaar/ui/icons";
import { useRouter } from "next/navigation";
import PageShell from "@vibaar/ui/PageShell";
import PageActionButton from "@vibaar/ui/common/PageActionButton";
import Button from "@vibaar/ui/common/Button";
import Section from "@vibaar/ui/common/Section";
import { cn } from "@/lib/utils";
import { focusRing } from "@vibaar/ui/styles";
import Dialog from "@vibaar/ui/common/Dialog";
import { useFormik } from "formik";
import * as Yup from "yup";
import useBusinessStore from "@/store/businessStore";
import useAuthStore from "@/store/authStore";
import StoreLogo from "@vibaar/ui/common/StoreLogo";

/**
 * The store's social platforms.
 *
 * This was a 370-line `icons` object: five brand logos hand-drawn twice each —
 * a greyed "old" variant (white fill under black at 40%) and a colour "new"
 * one — to express connected vs not. The icon set already has all five, and a
 * row that is not connected says so in words, so the state does not need a
 * second set of artwork to carry it.
 */
const PLATFORMS: {
  id: "instagram" | "tiktok" | "facebook" | "whatsapp" | "x";
  label: string;
  Icon: React.ComponentType<IconProps>;
}[] = [
  { id: "instagram", label: "Instagram", Icon: FaInstagram },
  { id: "tiktok", label: "TikTok", Icon: FaTiktok },
  { id: "facebook", label: "Facebook", Icon: FaFacebook },
  { id: "whatsapp", label: "WhatsApp", Icon: FaWhatsapp },
  { id: "x", label: "X", Icon: FaXTwitter },
];

type PlatformId = (typeof PLATFORMS)[number]["id"];

const Page = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const { store, getAuthenticatedUserStore, updateStore, fetchStores, isLoading, theme } =
    useBusinessStore();
  const [image, setImage] = React.useState<string | null>(() => {
    if (typeof store?.logo === "string") {
      return store.logo;
    }
    return null; // Use null to let StoreLogo handle initials
  });
  const [social, setSocial] = useState({
    instagram: "",
    tiktok: "",
    facebook: "",
    whatsapp: "",
    x: "",
  });
  const [selected, setSelected] = useState<PlatformId>("instagram");

  const [show, setShow] = useState(false);

  function hancleSaveSocial(val: string) {
    setSocial({ ...social, [selected]: val });
  }

  // Fetch store data on component mount using auth store pattern (matches dashboard/RootLayout)
  useEffect(() => {
    const fetchStoreData = async () => {
      if (!user?.business?.id && user?.id) {
        // If business ID is missing, try to fix it first
        try {
          await useAuthStore.getState().fetchAndFixBusinessId();
          // Give a moment for the state to update, then fetch store data
          setTimeout(() => {
            const updatedUser = useAuthStore.getState().user;
            if (updatedUser?.business?.id) {
              getAuthenticatedUserStore();
            }
          }, 100);
        } catch (error) {
          console.error("Failed to fix business ID in store details:", error);
        }
      } else if (user?.business?.id) {
        getAuthenticatedUserStore();
      }
    };

    fetchStoreData();
  }, [user?.business?.id, user?.id, getAuthenticatedUserStore]); // Match working pattern from dashboard

  // Formik initial values and validation schema
  const formik = useFormik({
    initialValues: {
      storeName: store?.name ?? "",
      storeTag: store?.tag ?? "",
      storeEmail: store?.email ?? "",
      storePhone: store?.phone ?? "",
      storeCategory: store?.category ?? "",
    },
    enableReinitialize: true, // Add this line
    validationSchema: Yup.object({
      storeName: Yup.string().required("Store name is required"),
      storeTag: Yup.string().matches(
        /^[a-z0-9-]*$/,
        "Use lowercase letters, numbers and hyphens only"
      ),
      storeEmail: Yup.string()
        .email("Invalid email")
        .required("Email is required"),
      storePhone: Yup.string()
        .matches(
          /^(\+?234|0)[0-9]{10,11}$/,
          "Please enter a valid Nigerian phone number (e.g., +2349027123696, 09027123696, or 08012345678)"
        )
        .required("Phone number is required"),
      storeCategory: Yup.string(),
    }),
    onSubmit: async (values) => {
      // Create JSON payload with nested structure matching backend requirements
      const businessPayload = {
        name: values.storeName || "",
        tag: values.storeTag || "",
        email: values.storeEmail || "",
        phone: values.storePhone || "",
        category: values.storeCategory || "",

        // Social Media Profiles
        instagram_profile: social.instagram || null,
        tiktok_profile: social.tiktok || null,
        facebook_profile: social.facebook || null,
        whatsapp_profile: social.whatsapp || null,
        x_profile: social.x || null,

        address: {
          country: store?.address?.country || "",
          province: store?.address?.province || null,
          address_line: store?.address?.address_line || "",
          address_line_two: (store as any)?.address?.address_line_two || null,
        },
        business_setting: {
          shipping_amount: store?.business_setting?.shipping_amount || 0,
          shipping_type: store?.business_setting?.shipping_type || "",
        },
        business_bank_account_detail: (store as any)?.business_bank_account_detail || [],
      };

      if (user?.business?.id) {
        // If we have a logo file, use FormData for everything
        if (logoFile) {
          const logoFormData = new FormData();
          logoFormData.append("name", values.storeName || "");
          logoFormData.append("tag", values.storeTag || "");
          logoFormData.append("email", values.storeEmail || "");
          logoFormData.append("phone", values.storePhone || "");
          logoFormData.append("category", values.storeCategory || "");

          // Social Media Profiles  
          logoFormData.append("instagram_profile", social.instagram || "");
          logoFormData.append("tiktok_profile", social.tiktok || "");
          logoFormData.append("facebook_profile", social.facebook || "");
          logoFormData.append("whatsapp_profile", social.whatsapp || "");
          logoFormData.append("x_profile", social.x || "");

          logoFormData.append("address[country]", store?.address?.country || "");
          logoFormData.append("address[province]", store?.address?.province || "");
          logoFormData.append("address[address_line]", store?.address?.address_line || "");
          logoFormData.append("address[address_line_two]", (store as any)?.address?.address_line_two || "");
          logoFormData.append("business_setting[shipping_amount]", String(store?.business_setting?.shipping_amount || 0));
          logoFormData.append("business_setting[shipping_type]", store?.business_setting?.shipping_type || "");
          logoFormData.append("logo", logoFile);

          // Use updateStore with FormData for logo + business details
          await updateStore(user.business.id, logoFormData as unknown as Parameters<typeof updateStore>[1], async () => {
            // Reset logo file state after successful upload, but keep image preview
            setLogoFile(null);
            // Don't reset image here - let the store data update handle it
            await getAuthenticatedUserStore();
            // Also refresh stores for dashboard
            await fetchStores();
          });
        } else {
          // No logo - use JSON payload for business details only
          await updateStore(user.business.id, businessPayload, async () => {
            await getAuthenticatedUserStore();
            // Also refresh stores for dashboard
            await fetchStores();
          });
        }
      }
    },
  });

  // Sync form values when store data updates
  useEffect(() => {
    if (store) {
      formik.setValues({
        storeName: store?.name ?? "",
        storeTag: store?.tag ?? "",
        storeEmail: store?.email ?? "",
        storePhone: store?.phone ?? "",
        storeCategory: store?.category ?? "",
      });
    }
  }, [store]); // Dependencies for when to update form

  // Sync social media profiles when store data updates
  useEffect(() => {
    if (store) {
      setSocial({
        instagram: store.instagram_profile || "",
        tiktok: store.tiktok_profile || "",
        facebook: store.facebook_profile || "",
        whatsapp: store.whatsapp_profile || "",
        x: store.x_profile || "",
      });
    }
  }, [store]);

  // Sync logo image state when store data updates
  useEffect(() => {
    if (store?.logo && typeof store.logo === "string") {
      setImage(store.logo);
    }
  }, [store?.logo]); // Update image when store logo changes

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();

      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImage(base64String);
      };

      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <PageShell
        pageHeader={{
          onBack: () => router.back(),
          title: "Store Details",
          actions: (
            <PageActionButton
              type="submit"
              onClick={() => formik.handleSubmit()}
              loading={isLoading}>
              Save
            </PageActionButton>
          ),
        }}>
          {/* Image Upload Section */}
          <div className="relative flex flex-col items-center">
            <button
              type="button"
              aria-label="Change store logo"
              className="relative size-20 cursor-pointer rounded-full"
              onClick={() => document.getElementById("imageInput")?.click()}>
              <StoreLogo
                src={image}
                storeName={store?.name || "Store"}
                size={80}
                className="w-full h-full"
              />
              {/* `bg-overlay` is the scrim token. This was `bg-black
                  bg-opacity-30` — the deprecated opacity utility, on a raw
                  colour. It is also keyboard-reachable now: the hover-only
                  reveal meant a focused control showed no affordance at all. */}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-overlay/30 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100">
                <Edit size={22} className="text-white" aria-hidden="true" />
              </div>
            </button>
            <input
              id="imageInput"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            <p className="text-foreground-muted text-body font-normal mt-3">
              Upload store logo
            </p>
          </div>

          {/* Storefront appearance. The preview keeps the store's own colour so
              the row means something at a glance; the action beside it was a
              190x27 SVG of LETTER PATHS filled `var(--brand)` — brand yellow as
              text on white, which is 1.3:1 and the reason it read as unreadable.
              It is a link-variant Button now: brandDeep, on the type scale, and
              selectable/translatable text rather than artwork. */}
          <div className="flex h-field items-center justify-between gap-3 rounded-field border border-outline-strong px-4">
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className="h-8 w-14 shrink-0 overflow-hidden rounded border border-outline-subtle bg-cover bg-center"
                style={
                  theme?.backgroundType === "image" && theme?.backgroundImage
                    ? { backgroundImage: `url(${theme.backgroundImage})` }
                    : { backgroundColor: theme?.backgroundColor || "var(--brand)" }
                }
              />
              <p className="truncate text-body text-foreground-secondary">
                Store appearance
              </p>
            </div>
            <Button
              variant="link"
              size="md"
              fullWidth={false}
              onClick={() => router.push("/dashboard/storefront/customise")}>
              <Edit size={16} aria-hidden="true" />
              Customise
            </Button>
          </div>


          {/* Formik Form */}
          <Section className="space-y-4">
              {/* Input Fields */}
              <InputField
                name="storeName"
                placeholder="Store name"
                type="text"
                value={formik.values.storeName}
                onChange={formik.handleChange}
                error={formik.errors.storeName}
              />
              <InputField
                name="storeTag"
                placeholder="Store handle (your public store link)"
                type="text"
                value={formik.values.storeTag}
                onChange={formik.handleChange}
                error={formik.errors.storeTag}
                disabled={!!store?.tag}
              />
              <p className="mt-1 text-caption text-foreground-muted">
                {store?.tag
                  ? `Your store link: vibaar.com/@${store.tag} · locked once set`
                  : "Lowercase letters, numbers and hyphens. This becomes your public store link and can't be changed later."}
              </p>
              <InputField
                name="storeEmail"
                placeholder="Store email"
                type="email"
                value={formik.values.storeEmail}
                onChange={formik.handleChange}
                error={formik.errors.storeEmail}
              />
              <InputField
                name="storePhone"
                placeholder="Store phone number"
                type="text"
                value={formik.values.storePhone}
                onChange={formik.handleChange}
                error={formik.errors.storePhone}
              />
              <InputField
                name="storeCategory"
                placeholder="Category"
                type="text"
                value={formik.values.storeCategory}
                onChange={formik.handleChange}
                error={formik.errors.storeCategory}
              />
            </Section>
            {/* Social profiles.
                These are FORM ROWS — you tap one to edit a value — so they are
                the shape this codebase already uses for that (AddressInput, the
                store-setup DropButton): `h-field`, field radius, one border,
                px-4. They were briefly ListItems, which is an information-LIST
                primitive carrying its own 40px leading slot and py-3 rhythm; at
                64px against a 52px InputField that made the column step in and
                out down the page. Full width comes from `w-full`, which the
                original hand-rolled buttons never had. */}
            <Section title="Social profile">
              {PLATFORMS.map(({ id, label, Icon }) => {
                const handle = social[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setSelected(id);
                      setShow(true);
                    }}
                    aria-label={`${handle ? "Edit" : "Add"} ${label} profile`}
                    className={cn(
                      "flex h-field w-full items-center gap-3 rounded-field border border-outline-strong px-4 text-left transition-colors hover:bg-surface-subtle",
                      focusRing
                    )}>
                    <Icon
                      size={22}
                      aria-hidden="true"
                      className={
                        handle ? "text-foreground-primary" : "text-foreground-muted"
                      }
                    />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-body",
                        handle
                          ? "font-medium text-foreground-primary"
                          : "text-foreground-secondary"
                      )}>
                      {handle ? `@${handle}` : `Add ${label} profile`}
                    </span>
                    <ChevronRight
                      size={18}
                      aria-hidden="true"
                      className="shrink-0 text-foreground-muted"
                    />
                  </button>
                );
              })}
            </Section>
      </PageShell>

      {/* The username sheet. It was an `absolute inset-0 bg-black` div — which,
          before the dashboard frame was fixed, resolved against the scrolling
          box and scrolled with the page instead of covering the screen. Dialog
          is the primitive: a bottom sheet on mobile, centred on desktop, with
          the focus trap, Escape handling and scrim the hand-rolled one lacked. */}
      <Dialog
        isOpen={show}
        onClose={() => setShow(false)}
        title={`${social[selected] ? "Edit" : "Add"} ${
          PLATFORMS.find((p) => p.id === selected)?.label ?? ""
        } profile`}>
        <div className="flex flex-col gap-4">
          <InputField
            name={`${selected}Username`}
            placeholder={`Your ${PLATFORMS.find((p) => p.id === selected)?.label} username`}
            type="text"
            value={social[selected]}
            onChange={(e) => hancleSaveSocial(e.target.value)}
          />
          <Button onClick={() => setShow(false)}>Save</Button>
        </div>
      </Dialog>
    </>
  );
};

export default Page;
