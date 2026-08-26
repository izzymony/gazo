/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
import Image from "next/image";
import InputField from "@vibaar/ui/common/InputField";
import CategorySelector from "./CategorySelector";
import StoreLogo from "@vibaar/ui/common/StoreLogo";
import { ChevronDown, Check } from "@vibaar/ui/icons";
import { useState } from "react";
import { formatPhoneNumber } from "@/lib/validation";

interface Props {
  data: {
    name: string;
    tag: string;
    email: string;
    phone: string;
    category: string;
    logo?: string | null;
  };
  error: {
    name?: string;
    tag?: string;
    email?: string;
    phone?: string;
    category?: string;
    logo?: string | null;
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setCategory: (val: string) => void;
  usePersonalContact: boolean;
  setUsePersonalContact: (val: boolean) => void;
  user: any;
}

export const DropButton = ({
  flag,
  icon,
  toogleDrop,
  text,
}: {
  flag?: string;
  icon?: boolean;
  toogleDrop: () => void;
  text: string;
}) => {
  return (
    <div
      onClick={toogleDrop}
      className={`peer flex relative w-full px-4 h-[52px] rounded-field border border-ink-20 focus-within:ring-1 focus-within:ring-black justify-between items-center text-body text-ink-90 font-medium`}>
      <p>{text}</p>
      <>
        {icon && (
          <span className="absolute z-dropdown right-4 top-[50%] transform -translate-y-1/2 cursor-pointer text-ink-40">
            <ChevronDown size={20} />
          </span>
        )}
        {flag && (
          <img
            className="absolute z-[999] right-4 top-[50%] transform -translate-y-1/2 cursor-pointer text-ink-40 rounded-full w-8 h-8 object-cover"
            src={`https://flagcdn.com/w40/${flag}.png`}
            alt="USA Flag"
          />
        )}
      </>
    </div>
  );
};

const StoreDetails = ({
  data,
  handleFileUpload,
  handleInputChange,
  error,
  setCategory,
  usePersonalContact,
  setUsePersonalContact,
  user,
}: Props) => {

  return (
    <>
      {/* Logo Upload Section */}
      <div className="flex flex-col items-center gap-3 mt-0">
        {/* Upload Container */}
        <div className="bg-ink-3 border border-dashed border-ink-20 rounded-card p-4 w-full max-w-sm">
          <label className="block cursor-pointer">
            <div className="flex flex-col items-center">
              {/* Logo Circle with Shadow */}
              <div className="relative mb-2">
                <div className="w-16 h-16 rounded-full shadow-card overflow-hidden bg-white border-2 border-ink-5">
                  <StoreLogo
                    src={data?.logo}
                    storeName={data?.name || "Store"}
                    size={64}
                    className="w-full h-full"
                  />
                </div>

                {/* Camera Icon Overlay */}
                <div className="absolute -bottom-0 -right-1 w-6 h-6 bg-ink-70 rounded-full flex items-center justify-center shadow-card">
                  <Image
                    width={16}
                    height={16}
                    src="/icons/upload-icon.svg"
                    alt="Upload"
                    className="w-4 h-4"
                  />
                </div>
              </div>

              {/* Upload Text */}
              <div className="text-center">
                <div className="text-body text-ink-80 font-medium mb-0">Upload store logo</div>
                <div className="text-caption text-ink-50">PNG, JPG up to 5MB</div>
              </div>
            </div>

            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>

      <div className="space-y-4 mt-4">
        <InputField
          type="text"
          name="name"
          value={data?.name}
          onChange={handleInputChange}
          placeholder="Store name"
          error={error?.name}
        />
        <InputField
          type="text"
          name="tag"
          value={data?.tag}
          onChange={handleInputChange}
          placeholder="Store handle"
          error={error?.tag}
        />

        <CategorySelector
          mode="store"
          selectedCategory={data.category}
          onCategorySelect={(category) => {
            if (typeof category === "string") setCategory(category);
          }}
          error={error.category}
        />

        {/* Contact Toggle Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-field p-3 mt-6">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setUsePersonalContact(!usePersonalContact)}
          >
            <div className={`w-5 h-5 border-2 rounded flex items-center justify-center flex-shrink-0 ${usePersonalContact
              ? 'bg-blue-500 border-blue-500'
              : 'bg-transparent border-ink-30'
              }`}>
              {usePersonalContact && <Check size={14} className="text-white" />}
            </div>
            <div>
              <div className="text-body font-medium text-blue-800">
                Use the same personal contact details
              </div>
              <div className="text-body-sm text-ink-60 mt-1">
                We'll use your account email ({user?.email}) and phone ({user?.phone})
              </div>
            </div>
          </div>
        </div>

        {/* Contact Fields - Only show when toggle is unchecked */}
        {!usePersonalContact && (
          <div className="space-y-4">
            <InputField
              type="email"
              name="email"
              value={data?.email}
              onChange={handleInputChange}
              placeholder="Store email"
              error={error?.email}
            />
            <InputField
              type="text"
              name="phone"
              value={data?.phone}
              onChange={(e) => {
                const formatted = formatPhoneNumber(e.target.value);
                e.target.value = formatted;
                handleInputChange(e);
              }}
              placeholder="Store phone number"
              error={error?.phone}
            />
          </div>
        )}
      </div>

    </>
  );
};

export default StoreDetails;