/* eslint-disable @typescript-eslint/no-explicit-any */
// import { IconType } from "react-icons";

export interface StoreTheme {
  backgroundColor?: string;
  backgroundType?: "color" | "image";
  backgroundImage?: string;
  primaryColor?: string;
  textColor?: string;
  accentColor?: string;
  pattern?: string;
}

/**
 * Props the legacy `MainLayout` forwards to a Header. Only the subset its one
 * caller (shop/spotlights) actually sets — the tab bar, pill bar, skip link,
 * logoDisplayCenter and searchComponent props that used to live here were set
 * by nothing anywhere in the app.
 *
 * New screens use PageShell + Header's slots directly; this exists to keep
 * MainLayout working until its last caller migrates.
 */
export interface HeaderProps {
  showBack?: boolean;
  customText?: string;
  onBackClick?: () => void;
  /** Shows a search icon that toggles the title out for a search field. */
  showSearch?: boolean;
  showInput?: boolean;
  handleSearchClick?: () => void;
}

/**
 * LEGACY layout, one caller left — see design-system/mainLayout.
 *
 * The thirteen button props are gone with the two `fixed bottom-0` action bars
 * they filled: buttonText, btnClass, onClickBtn, buttonType, isButtonLoading,
 * showBtn, showBeforeBtn, beforeButtonContent, afterButtonContent, showDivider,
 * secondaryText, secondaryLink, otpCheckMailNotification. Deleting the markup
 * without deleting the props would have left a legacy layout still advertising a
 * viewport-fixed CTA bar that the desktop rule forbids.
 */
export interface MainLayoutProps {
  addSpace?: boolean;
  title?: string;
  description?: string;
  features?: string[];
  imageSrc?: string;
  bgImage?: string;
  imgSrc?: string;
  children?: React.ReactNode;
  headerProps?: HeaderProps;
  showFooter?: boolean;
  staticContent?: boolean;
}
export interface User {
  user_id?: string;
  phone?: string;
  auth_type?: string;
  instagram_id?: string;
  instagram_username?: string;
  id?: string;
  lastname?: string;
  firstname?: string;
  user_name?: string;
  address?: string;
  state?: string;
  country?: string;
  email?: string;
  data?: { business?: { id?: string } };
  business?: {
    id?: string;
    name?: string;
  };
  profile_image?: string;
  date_of_birth?: string;
  // Referral system fields
  referred_by_username?: string;
  referral_activated?: boolean;
  shopping_credit?: number;
  withdrawable_credit?: number;
  total_referral_earned?: number;
  total_withdrawn?: number;
}

// Rewards system types (rewards = umbrella term, referrals = one source of rewards)
export interface RewardsInfo {
  referral_id: string; // User's referral ID (their @username)
  referral_link: string;
  shopping_credit: number;
  withdrawable_credit: number;
  total_credit: number;
  pending_earnings: number; // Pending referral earnings (not yet converted)
  total_referrals: number;
  activated_referrals: number;
  pending_referrals: number;
  total_earned: number;
  total_withdrawn: number;
  available_to_withdraw: number;
  min_withdrawal_threshold: number;
  can_withdraw: boolean;
  withdrawal_message?: string;
  max_usage_percent: number;
  referred_by?: string;
  referral_activated: boolean;
}

// Backward compatibility alias
export type ReferralInfo = RewardsInfo;

export interface CreditHistoryEntry {
  id: string;
  user_id: string;
  amount: number;
  remaining: number;
  type: string;
  source: string;
  referee_id?: string;
  referrer_id?: string;
  order_id?: string;
  used_at?: string;
  description?: string;
  created_at: string;
}
export interface SignupData {
  fullName?: string;
  firstname?: string;
  lastname?: string;
  user_name?: string;
  phoneNumber?: string;
  phone?: string;
  email?: string;
  password?: string;
  auth_type?: "email" | "instagram";
  otp?: string;
}

export interface OrderData {
  id: string;
  user_id: string;
  invoice?: string;
  sub_total: number;
  shipping_cost: number;
  total: number;
  payment_method: string;
  payment_receipt: string;
  shipping_option: string;
  shipping_option_id: string;
  // Nested order structure (API sometimes returns { order: {...} })
  order?: OrderData;
  buyer_activity?: Array<{
    product_id?: string;
    price?: number;
    quantity?: number;
    product?: {
      id?: string;
      title?: string;
      images?: string[];
      price?: number;
    };
  }>;
  items?: Array<{
    product_id?: string;
    price?: number;
    quantity?: number;
    product?: {
      id?: string;
      title?: string;
      images?: string[];
      price?: number;
    };
  }>;
  order_items?: Array<{
    product_id?: string;
    price?: number;
    quantity?: number;
    product?: {
      id?: string;
      title?: string;
      images?: string[];
      price?: number;
    };
  }>;
  price?: number;
  // shipping_address: {
  //   id: string;
  //   country: string;
  //   state: string;
  //   street: string;
  //   town: string;
  //   created_at: string;
  //   updated_at: string;
  //   is_default: boolean;
  //   shipping_user: {
  //     id: string;
  //     firstname: string;
  //     lastname: string;
  //     phone: string;
  //     shipping_address_id: string;
  //     created_at: string;
  //     updated_at: string;
  //     user_id: string;
  //   };
  // };
  shipping_profile_id: string;
  cart: { product_id: string; price: number; quantity: number }[];
  business_id: string;
  created_at: string | Date;
  updated_at: string | Date;
  status: string;
  activity?: [
    {
      action: string;
      time_stamp: string;
      actor_id: string;
    }
  ];
  // variants?: [];
}

export interface OTPData {
  otp: unknown;
}
export interface OTPPayload {
  identifier?: string;
  request_type?: string;
}

export interface ProfileData {
  fullname?: string;
  user_name?: string;
  phoneNumber?: string;
  email?: string;
}

interface Address {
  country: string;
  province: string;
  address_line: string;
}

interface PersonalisedSettings {
  background_color?: string;
  background_image?: string;
  background_state?: string;
  background_pattern?: string;
  created_at?: string;
  id?: string;
  updated_at?: string;
}

export interface ZoneRate {
  enabled: boolean;
  rate: number;
  // Preset delivery-time estimate shown to the buyer (e.g. "1-2 days"). Optional
  // for legacy rows saved before ETA existed.
  eta?: string;
}

// Seller Self-delivery flat rates by destination zone (Shipping D two-source model).
export interface SelfZones {
  local: ZoneRate;
  interstate: ZoneRate;
  international: ZoneRate;
}

interface BusinessSetting {
  business_id?: string;
  created_at?: string;
  id?: string;
  personalised_settings?: PersonalisedSettings;
  shipping_amount: number;
  shipping_type: string;
  partner_enabled?: boolean;
  self_zones?: SelfZones;
  updated_at?: string;
}

interface BusinessBankAccountDetail {
  bank: string;
  account: string;
  identifier: string;
}

export interface BusinessData {
  id?: string;
  logo?: string | undefined | ArrayBuffer | unknown;
  user_id?: string;
  name?: string;
  tag?: string;
  phone?: string;
  email?: string;
  category?: string;
  description?: string;
  
  // Social Media Profiles
  instagram_profile?: string;
  tiktok_profile?: string;
  facebook_profile?: string;
  whatsapp_profile?: string;
  x_profile?: string;
  
  rating?: string;
  deliveryTime?: string;
  preparationTime?: string;
  sold?: string;
  followers?: string;
  fulfilmentRate?: string;
  country?: string;
  state?: string;
  address?: Address;
  business_setting?: BusinessSetting;
  business_bank_account_detail?: BusinessBankAccountDetail;
  usersCount?: number;
  product_count?: number;
  followers_count?: number;
  average_rating?: number;
  is_verified?: boolean; // KYC1 — drives the buyer-facing Verified badge
}

// export interface BusinessData {
//   id?: string;
//   logo?: string | undefined | ArrayBuffer | unknown;
//   user_id?: string;
//   name?: string;
//   tag?: string;
//   phone?: string;
//   email?: string;
//   category?: string;
//   description?: string;
//   rating?: string;
//   deliveryTime?: string;
//   preparationTime?: string;
//   sold?: string;
//   followers?: string;
//   fulfilmentRate?: string;
//   country?: string;
//   state?: string;
//   address?: string | {
//     address_line? : string
//   };

//   business_setting?: unknown;
//   business_bank_account_detail?: unknown;

//   bank_name?: string;
//   account_number?: string;
//   account_name?: string;

//   shipping_amount?: number | null;
//   shipping_type?: string;
// }
export interface BusinessStatsResponse {
  orders: {
    today: number;
    yesterday: number;
  };
  sales: {
    today: number;
    yesterday: number;
  };
  visitors: {
    today: number;
    yesterday: number;
  };
}

export interface BusinessPayloadData {
  id?: string;
  logo?: string | null | undefined;
  user_id?: string;
  name?: string;
  tag?: string;
  phone?: string;
  email?: string;
  category?: string;
  image?: string[];

  country?: string;
  state?: string;
  address?: string | object;
  business_setting?: unknown;
  business_bank_account_detail?: unknown;

  bank_name?: string;
  account_number?: string;
  account_name?: string;

  shipping_amount?: number | null;
  shipping_type?: string;
}

export interface ProductData {
  slug?: any;
  id?: string;
  product_id?: string;
  created_at?: string | Date;
  quantity?: number;
  title?: string;
  buyer?: string;
  variant?: [];
  business_id?: string;
  category?: {
    name?: string;
  };
  variants?: Variant[]; // Property ownership variant system
  original_price?: string | null;
  old_price?: string | null;
  rating?: string;
  stock?: string | number;
  status?: string | number;
  description?: string;
  prices?: string | string | [];
  price?: string | null;
  oldPrice?: string | null;
  collections?: string[]; // Array of collection ids or names
  inventoryStocks?: string | null;
  images?: ImageProps[];
  image?: string[];
  shipping?: string; // Only two options for shipping
  variations?: Variation[]; // Array of variations
  variantDetails?: VariantDetail[];
  color?: string;
  product_rating?: any[];
  tag?: string[];
  name?: string;
  variant_combinations?: Array<{
    combination_key?: string;
    price?: number;
    stock?: number;
    images?: string[];
  }>;
}
export interface ProductPayloadData {
  id?: string;
  title?: string;
  description?: string;
  price: {
    original_price?: string;
    price?: string;
    // discount?: string | null;
  };
  // price?: string | null;
  oldPrice?: string | null;
  collections?: string[]; // Array of collection ids or names
  inventoryStocks?: string | null;
  images?: ImageProps[] | string[] | null;
  shipping?: string; // Only two options for shipping
  variations?: Variation[]; // Array of variations
  variantDetails?: VariantDetail[]; // Array of variant details
}

// Variation and VariantDetail types (also with optional fields)
export interface Variation {
  option?: string;
  name?: string;
  values?: string[]; // Array of option values like colors or sizes
}

export interface ImageProps {
  url?: string;
  name?: string;
  toggle?: boolean;
  base64?: string;
}

export interface VariantDetail {
  combination?: string;
  price?: number | null;
  stock?: number | null;
}

// Property ownership variant system interfaces
export interface Variant {
  id?: string;
  name: string;
  status?: string;
  types: string[]; // The values for this variant (e.g., ["Red", "Blue", "Green"])
  product_id?: string;
  // Property ownership system
  owned_properties: string[]; // Which properties this variant owns (e.g., ["price", "stock", "image"])
  price_values?: { [value: string]: number }; // Price adjustments per variant value
  stock_values?: { [value: string]: number }; // Stock amounts per variant value
  image_values?: { [value: string]: string }; // Image URLs per variant value
}

export interface VariantCombination {
  key: string; // Combination identifier (e.g., "Red-Large")
  values: string[]; // Array of values (e.g., ["Red", "Large"])
  price: number; // Calculated price for this combination
  stock: number; // Calculated stock for this combination
  images: string[]; // Calculated images for this combination
  status: 'active' | 'out_of_stock'; // Calculated status
}

export interface Variation {
  option?: string;
  name?: string;
  values?: string[];
}
// Define an interface for the expected error response structure
export interface ErrorResponse {
  message?: string;
  error?: string;
}

export type CartItem = {
  product_id?: string;
  business_id?: string;
  quantity?: number;
  price?: number;
};

export interface StoreData {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  tag?: string;
  category?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  is_verified?: boolean; // KYC1 — drives the buyer-facing Verified badge
  
  // Social Media Profiles
  instagram_profile?: string;
  tiktok_profile?: string;
  facebook_profile?: string;
  whatsapp_profile?: string;
  x_profile?: string;
  
  address?: Address;
  business_bank_account_detail?: BusinessBankAccountDetail;
  business_setting?: BusinessSetting;
  rating?: string;
  sold?: string;
  followers?: string;
  preparationTime?: string;
  deliveryTime?: string;
  fulfilmentRate?: string;
  description?: string;
  logo?: string | undefined | ArrayBuffer | unknown;
  
  // Analytics fields for vendor cards
  followers_count?: number;
  average_rating?: number;
}
