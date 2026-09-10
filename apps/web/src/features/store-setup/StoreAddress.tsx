/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
import InputField from "@vibaar/ui/common/InputField";
import { useState } from "react";
import Button from "@vibaar/ui/common/Button";
import LocationModal from "@/hooks/locationmodal";
import Loader from "@vibaar/ui/common/Loader";
import { BiChevronDown } from "@vibaar/ui/icons";
import { DropButton } from "./StoreDetails";
import { Categories, SubCategories, BasicCategory } from "@/store/businessStore";
import Dialog from "@vibaar/ui/common/Dialog";

interface Props {
  data: {
    country: string;
    state: string;
    address?: string;
  };
  error: {
    country?: string;
    state?: string;
    address?: string;
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setAddress: (val: string) => void;
  setCountry: (val: string) => void;
}
export interface SubCategoryProps {
  name: string;
  emoji: string;
}
export interface CategoryProps {
  name: string;
  emoji: string;
  subcategories: SubCategoryProps[];
  id: string;
}

// Address truncation helper function
const truncateAddress = (address: string, maxLength: number = 45): string => {
  if (!address) return "Store address";

  if (address.length <= maxLength) {
    return address;
  }

  // Smart truncation - try to break at comma for better readability
  const truncated = address.substring(0, maxLength);
  const lastComma = truncated.lastIndexOf(',');

  // If there's a comma within reasonable range, cut there
  if (lastComma > maxLength * 0.7) {
    return truncated.substring(0, lastComma) + '...';
  }

  // Otherwise, simple truncation
  return truncated + '...';
};

const ModalHead = ({
  value,
  change,
  type,
}: {
  value: string;
  change: (val: string) => void;
  type: "country" | "category" | "bank";
}) => (
  <div className="w-full flex flex-col items-center space-y-4">
    <p className="text-foreground-primary text-body-lg font-medium ">
      Select a{" "}
      {type === "country"
        ? "country"
        : type === "category"
          ? "category"
          : "bank"}
    </p>
    <InputField
      type="text"
      name="search"
      value={value}
      onChange={(e) => change(e.currentTarget.value)}
      placeholder={`Select ${type === "country"
        ? "country"
        : type === "category"
          ? "category"
          : "bank"
        }`}
      showSearch={true}
    />
  </div>
);

const CountryComponent = ({
  click,
  item,
  selectedCountry,
  type = "country",
}: {
  click: () => void;
  item: { flag: string; name: string };
  selectedCountry: { flag: string; name: string };
  type: "country" | "category" | "bank";
}) => (
  <div
    onClick={click}
    className={
      selectedCountry.name === item.name
        ? "flex text-body font-normal items-center relative text-foreground-primary px-1 py-2 rounded-field bg-brand/10 border-brandDeep border justify-between"
        : "flex text-body font-normal relative items-center text-foreground-primary px-1 py-2 rounded-field justify-between"
    }>
    <div className="flex gap-1 items-center">
      {type === "category" ? (
        <span className="text-xl mr-3">{item.flag}</span>
      ) : (
        <img
          className="rounded-full w-6 h-6 object-cover mr-3"
          src={`https://flagcdn.com/w40/${item.flag}.png`}
          alt={item.name}
        />
      )}
      {item.name}
    </div>
    {type !== "country" && (
      <input
        type="checkbox"
        checked={selectedCountry.name === item.name}
        className="custom-checkbox"
      />
    )}
  </div>
);

// Component for full Categories (with subcategories)
const CategoryComponent = ({
  item,
  subSelected,
  setSelected,
  setSubSelected,
  select = [],
  setSelect,
}: {
  item: Categories;
  setSelected: (val: Categories) => void;
  subSelected: SubCategories;
  setSubSelected: (val: SubCategories) => void;
  select: string[];
  setSelect: (val: string[]) => void;
}) => {
  return (
    <div className="w-full p-2 bg-surface border-b ">
      {/* Main Category */}
      <button type="button"
        onClick={() => {
          if (select.includes(item.name)) {
            setSelect(select.filter((it) => it !== item.name));
          } else {
            setSelect([...select, item.name]);
          }
          setSelected(item);
        }}
        className="text-left w-full flex cursor-pointer text-body font-normal relative items-center text-foreground-primary px-2 py-2 rounded-field">
        {item.name}

        <span
          className="absolute z-[999] right-4 top-[50%] transform -translate-y-1/2 cursor-pointer text-foreground-muted">
          <BiChevronDown size={25} />
        </span>
      </button>

      {/* Subcategories (Expandable) */}
      {select.includes(item.name) && item.sub_categories && (
        <div className="mx-4 space-y-2">
          {item.sub_categories.map((sub) => (
            <div
              key={sub.name}
              onClick={() => setSubSelected(sub)}
              className={
                subSelected.name === sub.name
                  ? "flex text-body font-normal items-center relative text-foreground-primary px-4 py-3 justify-between rounded-field bg-brand/10 border-brandDeep border"
                  : "flex text-body font-normal relative items-center justify-between text-foreground-primary px-4 py-3 rounded-field"
              }>
              {`${sub.name}`}

              <input
                type="checkbox"
                checked={sub.name === subSelected.name}
                className="custom-checkbox"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Component for BasicCategory (simple categories from API)
const BasicCategoryComponent = ({
  item,
  selected,
  setSelected,
}: {
  item: BasicCategory;
  selected: BasicCategory;
  setSelected: (val: BasicCategory) => void;
}) => {
  return (
    <div className="w-full p-2 bg-surface border-b ">
      <div
        onClick={() => setSelected(item)}
        className={
          selected.id === item.id
            ? "flex cursor-pointer text-body font-normal items-center relative text-foreground-primary px-2 py-2 rounded-field bg-brand/10 border-brandDeep border"
            : "flex cursor-pointer text-body font-normal relative items-center text-foreground-primary px-2 py-2 rounded-field"
        }>
        <span className="text-xl mr-3">{item.icon}</span>
        {item.name}

        <input
          type="checkbox"
          checked={selected.id === item.id}
          className="custom-checkbox ml-auto"
        />
      </div>
    </div>
  );
};

export const Modal = ({
  isOpen,
  buttonAction,
  selectedCountry = { name: "", flag: "" },
  setSelectedCountry = () => { },
  type,
  data,
  search,
  setSearch,
  datas,
  basicDatas,
  setSelectedCategory = () => { },
  setSelectedBasicCategory = () => { },
  selectedBasicCategory = { id: "", name: "", icon: "" },
  subSelecteted = {
    category_id: "",
    created_at: "",
    default_height: 0,
    default_length: 0,
    default_weight: 0,
    default_width: 0,
    description: "",
    icon: "",
    id: "",
    name: "",
    slug: "",
    status: "",
    updated_at: ""
  },
  setSubSelected = () => { },
  select = [],
  setSelect = () => { },
}: {
  isOpen: boolean;
  buttonAction: () => void;
  selectedCountry?: { name: string; flag: string };
  setSelectedCountry?: (val: { name: string; flag: string }) => void;
  type: "country" | "category" | "bank";
  data?: { name: string; flag: string }[];
  datas?: Categories[];
  basicDatas?: BasicCategory[];
  search: string;
  setSearch: (val: string) => void;
  setSelectedCategory?: (val: Categories) => void;
  setSelectedBasicCategory?: (val: BasicCategory) => void;
  selectedBasicCategory?: BasicCategory;
  subSelecteted?: SubCategories;
  setSubSelected?: (val: SubCategories) => void;
  select?: string[];
  setSelect?: (val: string[]) => void;
}) => {
  return (
    <Dialog isOpen={isOpen} onClose={buttonAction} ariaLabel={`Select a ${type}`}>
      <div className="flex flex-col space-y-4">
        <ModalHead value={search} change={setSearch} type={type} />
        <div className="overflow-y-scroll scrollbar-hide max-h-[55vh]">
          {(() => {
            if (data) {
              // Country data
              return data.map((item) => (
                <CountryComponent
                  key={item.name}
                  item={item}
                  click={() => setSelectedCountry(item)}
                  selectedCountry={selectedCountry}
                  type={type}
                />
              ));
            } else if (basicDatas) {
              // Basic category data from the simple API
              return basicDatas.map((item) => (
                <BasicCategoryComponent
                  key={item.id}
                  item={item}
                  selected={selectedBasicCategory}
                  setSelected={setSelectedBasicCategory}
                />
              ));
            } else if (datas) {
              // Full category data with subcategories
              return datas.map((item) => (
                <CategoryComponent
                  key={item.name}
                  item={item}
                  setSelected={setSelectedCategory}
                  subSelected={subSelecteted}
                  setSubSelected={setSubSelected}
                  select={select}
                  setSelect={setSelect}
                />
              ));
            }

            return null;
          })()}
        </div>
        <Button className="max-w-full" onClick={buttonAction} type="button">
          Select {type === "country" ? "country" : type === "bank" ? "bank" : "category"}
        </Button>
      </div>
    </Dialog>
  );
};

const StoreAddress = ({
  data,
  handleInputChange,
  error,
  setAddress,
}: Props) => {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<any>({});
  const [isLoctionModalOpen, setIsLocationModalOpen] = useState(false);
  const openLocationModal = () => setIsLocationModalOpen(true);
  const closeLocationModal = () => setIsLocationModalOpen(false);
  if (loading) return <Loader />;

  return (
    <>
      <div className="space-y-4 mt-[0px]">
        <DropButton
          toogleDrop={() => { }} // Disable click
          text="Nigeria"
          flag="ng"
        />
        <InputField
          type="text"
          name="state"
          value={data?.state}
          onChange={handleInputChange}
          placeholder="State"
          error={error?.state}
        />
        <DropButton
          toogleDrop={openLocationModal}
          text={truncateAddress(location?.properties?.full_address) || "Store address"}
          icon={true}
        />

      </div>
      <LocationModal
        isLocationModalOpen={isLoctionModalOpen}
        closeLocationModal={closeLocationModal}
        setLoading={setLoading}
        setLocation={setLocation}
        location={location}
        setAddress={setAddress}
      />
    </>
  );
};

export default StoreAddress;