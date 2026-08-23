"use client";

import { ColoredPattern } from "@/features/seller-dashboard/coloredpattern";
import PageShell from "@/design-system/PageShell";
import Header from "@/design-system/common/Header";
import Button from "@/design-system/common/Button";
import Section from "@/design-system/common/Section";
import useBusinessStore from "@/store/businessStore";
import useAuthStore from "@/store/authStore";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

const Page: React.FC = () => {
  const { user } = useAuthStore();
  const {
    theme,
    store,
    updateThemeColor,
    isLoading,
    updateBackgroundImage,
    getStoreById,
    getAuthenticatedUserStore,
  } = useBusinessStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<number>(0);
  const [color, setColor] = useState<string | undefined>(
    theme?.backgroundColor ?? ""
  );
  const [pattern, setPattern] = useState<string | undefined>(
    theme?.pattern ?? ""
  );
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState(theme?.backgroundImage);

  useEffect(() => {
    if (theme.backgroundType == "color") {
      setActiveTab(0);
    } else {
      setActiveTab(1);
    }
  }, [theme.backgroundType]);

  // Fetch store data on component mount using auth store pattern (matches store details)
  useEffect(() => {
    if (user?.business?.id) {
      getAuthenticatedUserStore();
    }
  }, [user?.business?.id, getAuthenticatedUserStore]); // Match working pattern from store details

  // Sync component state with theme updates
  useEffect(() => {
    setColor(theme?.backgroundColor ?? "");
    setPattern(theme?.pattern ?? "");
    setImage(theme?.backgroundImage);
  }, [theme.backgroundColor, theme.pattern, theme.backgroundImage]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFile(file);
      setImage(URL.createObjectURL(file));
    }
  };

  const handleSave = () => {
    // Validate business ID exists (from auth store)
    if (!user?.business?.id) {
      toast.error("Business information is missing. Please try again.");
      return;
    }

    // Handle color theme save
    if (activeTab === 0) {
      if (!color) {
        toast.error("Please select a background color before saving.");
        return;
      }

      updateThemeColor({
        id: user?.business?.id ?? "",
        payload: {
          background_color: color,
          background_pattern: pattern || "",
          background_state: "color",
        },
        callback: () => {
          getAuthenticatedUserStore();
        },
      });
    }
    // Handle image theme save
    else if (activeTab === 1) {
      if (!file) {
        toast.error("Please select an image before saving.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      updateBackgroundImage(user?.business?.id ?? "", formData, () => {
        getAuthenticatedUserStore();
        // Reset file state after successful upload
        setFile(null);
      });
    }
    // Handle unexpected tab state
    else {
      toast.error("Invalid theme selection. Please try again.");
    }
  };

  const tabs = [
    {
      id: 0,
      label: "Colored Pattern",
      content: (
        <ColoredPattern
          onSelect={(value: string | undefined) => setColor(value)}
          onPatternSelect={(patternValue: string) => setPattern(patternValue)}
        />
      ),
    },
    {
      id: 1,
      label: "Image",
      content: (
        <div className="relative flex flex-col items-center w-full rounded-field">
          <div className="relative w-full">
            <Image
              src={image || "/images/store_front_default_bg.svg"}
              sizes="100vw"
              alt="Background preview"
              width={350}
              height={220}
              className="w-full h-[220px] object-cover cursor-pointer rounded-field"
              onClick={() => document.getElementById("imageInput")?.click()}
            />
            <Image
              src={"/images/upload-icon.svg"}
              alt="Upload icon"
              width={0}
              height={0}
              className="absolute inset-0 m-auto text-ink-40 cursor-pointer w-auto"
              onClick={() => document.getElementById("imageInput")?.click()}
            />
          </div>
          <input
            id="imageInput"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
            aria-label="Upload background image"
          />
          <p className="text-center text-ink-40 text-body-sm font-normal mt-6">
            Tap to upload a background image
          </p>
        </div>
      ),
    },
  ];

  return (
    <PageShell
      header={
        <Header
          showBack
          onBackClick={() => router.back()}
          customText="Appearance"
        />
      }
      footerAction={
        <Button type="button" onClick={handleSave} loading={isLoading}>
          Save
        </Button>
      }>
      <Section title="Background style">
        <div className="w-full">
          {/* Tab Headers */}
          <div className="flex bg-ink-5 rounded-field px-1 py-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-row gap-2 items-center justify-center flex-1 text-center text-body-sm rounded-field py-2 px-4 transition-colors ${activeTab === tab.id
                  ? "bg-white text-ink-90"
                  : "text-ink-40"
                  }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="py-4 w-full bg-white">{tabs[activeTab].content}</div>
        </div>
      </Section>
    </PageShell>
  );
};

export default Page;
