/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from "@/lib/client";
import { getQueryClient } from "@/lib/api/queryClient";
import { unwrap } from "@/lib/api/unwrap";
import {
  BusinessData,
  BusinessPayloadData,
  BusinessStatsResponse,
  SelfZones,
  StoreData,
} from "@/lib/types";
import { toast } from "sonner";
import { create } from "zustand";
import { AxiosError, AxiosResponse } from "axios";
import { handleAxiosError } from "@/lib/utils";
import Cookies from "js-cookie";
import { persist } from "zustand/middleware";
import { createJSONStorage } from "zustand/middleware";
import createQuotaSafeStorage from "@/utils/quotaSafeStorage";

export interface CustomerAnalytics {
  percent_change: {
    active_customers: number;
    average_customer_value: number;
    inactive_customers: number;
    new_customers: number;
    returning_customers: number;
  };
  summary: {
    active_customers: number;
    average_customer_value: number;
    inactive_customers: number;
    new_customers: number;
    returning_customers: number;
  };
}

export interface SaleAnalytics {
  percent_change: {
    active_orders: number;
    average_order_value: number;
    cancelled_orders: number;
    store_visitors: number;
    total_orders: number;
    total_sales: number;
  };
  summary: {
    active_orders: number;
    average_order_value: number;
    cancelled_orders: number;
    store_visitors: number;
    total_orders: number;
    total_sales: number;
  };
}

export interface SalesDashboardAnalytics {
  percent_change: {
    revenue_generated: number;
    store_visitors: number;
    total_orders: number;
    total_sales: number;
  };
  summary: {
    revenue_generated: number;
    store_visitors: number;
    total_orders: number;
    total_sales: number;
  };
}

export interface ProductRanking {
  description: string;
  id: string;
  image: string[];
  slug: string;
  stock: number;
  title: string;
  total_orders: number;
  total_sales: number;
  total_views: number;
}

export interface CustomerRanking {
  firstname: string;
  id: string;
  is_new: boolean;
  last_purchase: string;
  lastname: string;
  state: string;
  total_orders: number;
  total_spent: number;
  user_name: string;
  profile_image?: string;
}

interface Banks {
  id: number;
  name: string;
  slug: string;
  code: string;
  longcode: string;
  gateway: string;
  pay_with_bank: boolean;
  supports_transfer: boolean;
  active: boolean;
  country: string;
  currency: string;
  type: string;
  is_deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Select {
  AccountNumber: string;
  AccountName: string;
  BankCode: string;
}

interface Category {
  created_at: string;
  external_category_id: string;
  id: string;
  max_weight: number;
  min_weight: number;
  name: string;
  status: string;
  updated_at: string;
}

interface FollowedBusiness {
  address: any;
  business_bank_account_detail: any;
  business_setting: any;
  category: string;
  created_at: string;
  email: string;
  id: string;
  name: string;
  order_count: number;
  phone: string;
  tag: string;
  updated_at: string;
  user_id: string;
}

interface StoreStats {
  avg_delivery_time: number;
  avg_order_prep_time: number;
  followers_count: number;
  fulfilment_rate: number;
  products_sold: number;
  ratings: number;
}

export interface CreateCoupon {
  type: string;
  title: string;
  code: string;
  discount_type: string;
  amount: number;
  apply_to: "products";
  product_ids: string[];
  min_requirement: {
    enabled: boolean;
    type: string;
    threshold: number;
  };
  limit: {
    enabled: boolean;
    type: string;
    limit_value: number;
  };
  valid_from: string;
  valid_to: string;
}

export interface BusinessDatas {
  address: {
    address_line: string;
    address_line_two: string | null;
    business_id: string;
    country: string;
    created_at: string;
    id: string;
    province: string;
    shipbubble_address_code: number;
    updated_at: string;
  };
  business_bank_account_detail: {
    account: string;
    bank: string;
    business_id: string;
    created_at: string;
    id: string;
    identifier: string;
    updated_at: string;
  };
  business_setting: {
    business_id: string;
    created_at: string;
    id: string;
    personalised_settings: {
      background_color: string;
      background_image: string;
      background_state: string;
      background_pattern: string;
      created_at: string;
      id: string;
      updated_at: string;
    };
    shipping_amount: number;
    shipping_type: string;
    updated_at: string;
  };
  category: string;
  created_at: string;
  email: string;
  id: string;
  name: string;
  order_count: number;
  phone: string;
  tag: string;
  updated_at: string;
  user_id: string;
  // KYC1 — the seller's own verification/trust state (denormalised on Business)
  is_verified?: boolean;
  kyc_status?: string;
  lifetime_sales?: number;
}

// KYC (KYC1) — the seller's own verification record from GET /kyc/status.
export interface KycRecord {
  id?: string;
  status: "pending" | "approved" | "rejected" | string;
  reason?: string;
  document?: string;
  selfie?: string;
  document_type?: string;
  legal_name?: string;
  created_at?: string;
  reviewed_at?: string;
}

interface BusinessState {
  isLoading: boolean;
  isLoadingTheme: boolean;
  error: string | null;
  theme: {
    backgroundColor?: string;
    backgroundType?: string;
    backgroundImage?: string;
    pattern?: string;
  };
  updateThemeColor: ({
    id,
    payload,
    callback,
  }: UpdateThemeProps) => Promise<void>;
  updateBackgroundImage: (
    id: string,
    payload: FormData,
    callback?: () => void
  ) => Promise<void>;
  store: StoreData | null;
  stor: StoreData | null;
  storeMetrics: BusinessStatsResponse | null;
  stores: StoreData[];
  sales: SaleAnalytics;
  customer: CustomerAnalytics;
  productrakings: ProductRanking[];
  customerranking: CustomerRanking[];
  followedBusinesses: FollowedBusiness[];
  banks: Banks[];
  selectedBank: Select;
  storeStats: StoreStats;
  salesDashboardAnalytics: SalesDashboardAnalytics;
  discounts: any[];
  selectedTransaction: any;
  fetchBanks: (pageNumber: number) => Promise<void>;
  setBanks: (val: Banks[]) => void;
  validateBank: (val: {
    account_number: string;
    bank_code: string;
  }) => Promise<void>;
  setStore: (data: BusinessData, isMarketplace?: boolean) => void;
  setStoreMetrics: (data: BusinessStatsResponse) => void;
  addStore: (
    storePayload: BusinessPayloadData,
    callback?: () => void
  ) => Promise<void>;
  fetchStores: () => Promise<void>;
  fetchStoresBySearch: (search: string) => Promise<void>;
  updateStore: (
    id?: string | undefined,
    storePayload?: BusinessPayloadData,
    callback?: () => void
  ) => Promise<void>;
  updateShippingSettings: (
    id: string,
    payload: { partner_enabled: boolean; self_zones: SelfZones },
    callback?: () => void
  ) => Promise<void>;
  getStoreById: (id: string | undefined) => Promise<void>;
  getAuthenticatedUserStore: () => Promise<void>;
  hydrateFromBusiness: (business: StoreData | null) => void;
  getStoreMetrics: (id: string) => Promise<void>;
  clearStoreState: () => void;
  setCustomerAnalytics: (data: CustomerAnalytics) => void;
  fetchCustomerAnalytics: (date: string) => Promise<void>;
  setSalesAnalytics: (data: SaleAnalytics) => void;
  fetchSalesAnalytics: (date: string) => Promise<void>;
  fetchCustomersRanking: (pageNumber: number) => Promise<void>;
  setCustomerRanking: (data: CustomerRanking[]) => void;
  fetchProductRanking: (pageNumber: number) => Promise<void>;
  setProductRanking: (data: ProductRanking[]) => void;
  fetchFollowedBusinessess: (pageNumber: number) => Promise<void>;
  setFollowedBusinessess: (val: FollowedBusiness[]) => void;
  fetchStoreStats: (businessId: string) => Promise<void>;
  fetchDiscount: (pageNumber: number) => Promise<void>;
  setDiscount: (val: any) => void;
  createDiscount: (data: CreateCoupon) => Promise<void>;
  fetchSalesDashboardAnalytics: () => Promise<void>;
  setSelectedTransaction: (val: any) => void;
  walletAnalytics: WalletAnalytics;
  fetchWalletAnalytics: () => Promise<void>;
  walletTransactions: WalletTransactions[];
  fetchWalletTransactions: () => Promise<void>;
  withdrawFund: (data: WalletInterface) => Promise<void>;
  // KYC (KYC1)
  kycStatus: KycRecord | null;
  submitKyc: (formData: FormData) => Promise<KycRecord | null>;
  fetchKycStatus: () => Promise<void>;
  getBankAccounts: () => Promise<void>;
  bankAccounts: BankAccount[];
  getOtp: (val: string) => Promise<void>;
  createBank: (val: BankData) => Promise<void>;
  deleteBankAccount: (bankId: string) => Promise<void>;
  setDefaultBankAccount: (bankId: string) => Promise<void>;
  fetchBusinessProduct: (pageNumber: number) => Promise<void>;
  setBusinessProducts: (data: BusinessProduct[]) => void;
  businessProduct: BusinessProduct[];
  fetchBusinessById: (id: string) => Promise<void>;
  singleStore: BusinessDatas;
  fetchCollection: (page: number, businessId: string) => Promise<void>;
  setCollection: (val: Collections[]) => void;
  collection: Collections[];
  fetchExistingTags: () => Promise<string[]>;
}

// Basic category from the API endpoint
export interface BasicCategory {
  id: string;
  name: string;
  icon: string;
}

// Full category with subcategories (for other endpoints)
export interface Categories {
  created_at: string;
  description: string;
  external_category_id: string;
  id: string;
  max_weight: number;
  min_weight: number;
  name: string;
  slug: string;
  status: string;
  sub_categories?: SubCategories[];
  updated_at: string;
}

export interface SubCategories {
  category_id: string;
  created_at: string;
  default_height: number;
  default_length: number;
  default_weight: number;
  default_width: number;
  description: string;
  icon: string;
  id: string;
  name: string;
  slug: string;
  status: string;
  updated_at: string;
}

interface Collections {
  business_id: string;
  created_at: string;
  description: string;
  id: string;
  name: string;
  slug: string;
  updated_at: string;
}

interface Category {
  created_at: string;
  external_category_id: string;
  id: string;
  max_weight: number;
  min_weight: number;
  name: string;
  status: string;
  sub_categories: null; // You can replace with type if sub_categories are known
  updated_at: string;
}

interface SubCategory {
  category_id: string;
  created_at: string;
  id: string;
  name: string;
  status: string;
  updated_at: string;
}

export interface BusinessProduct {
  barcode: string;
  business_id: string;
  category: Category;
  category_id: string;
  created_at: string;
  description: string;
  discounts: any[]; // Replace with appropriate type if known
  height: number;
  id: string;
  image: string[];
  is_combination: boolean;
  length: number;
  old_price: number;
  price: number;
  product_rating: any[]; // Replace with appropriate type if known
  sku: string;
  slug: string;
  status: string;
  stock: number;
  sub_category: SubCategory;
  sub_category_id: string;
  tag: string[];
  title: string;
  updated_at: string;
  user_id: string;
  weight: number;
  width: number;
}

export interface BankData {
  bank: string;
  account_number: string;
  account_name: string;
  bank_code: number;
  is_default: boolean;
}

export interface BankAccountMetadata {
  paystack_transfer_recipient_code: string;
}

export interface BankAccount {
  id: string;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  bank: string;
  account_number: string;
  account_name: string;
  bank_code: number;
  business_id: string;
  is_default: boolean;
  metadata: BankAccountMetadata[];
}

export interface WalletInterface {
  amount: number;
  bank_account_details_id: string;
  otp: string;
}

export interface WalletTransactions {
  amount: number;
  balance_after: number;
  balance_before: number;
  beneficiary: string;
  created_at: string;
  external_reference: string;
  from: string;
  id: string;
  metadata: {
    order_item_id: string;
  }[];
  reference: string;
  status: string;
  to: string;
  type: string;
  type_description: string;
  updated_at: string;
  wallet_id: string;
}

export interface WalletAnalytics {
  available_balance: number;
  clearing_balance: number;
  orders_in_progress: number;
  total_earnings: number;
  total_withdrawn: number;
}

interface UpdateThemeProps {
  id: string;
  payload: {
    background_color?: string;
    background_pattern?: string;
    background_state?: string;
  };
  callback?: () => void;
}

const useBusinessStore = create<BusinessState>()(
  persist(
    (set, get) => ({
      isLoading: false,
      isLoadingTheme: false,
      error: null,
      stores: [],
      sales: {
        percent_change: {
          active_orders: 0,
          average_order_value: 0,
          cancelled_orders: 0,
          store_visitors: 0,
          total_orders: 0,
          total_sales: 0,
        },
        summary: {
          active_orders: 0,
          average_order_value: 0,
          cancelled_orders: 0,
          store_visitors: 0,
          total_orders: 0,
          total_sales: 0,
        },
      },
      storeStats: {
        avg_delivery_time: 0,
        avg_order_prep_time: 0,
        followers_count: 0,
        fulfilment_rate: 0,
        products_sold: 0,
        ratings: 0,
      },
      productrakings: [],
      banks: [],
      followedBusinesses: [],
      customerranking: [],
      customer: {
        percent_change: {
          active_customers: 0,
          average_customer_value: 0,
          inactive_customers: 0,
          new_customers: 0,
          returning_customers: 0,
        },
        summary: {
          active_customers: 0,
          average_customer_value: 0,
          inactive_customers: 0,
          new_customers: 0,
          returning_customers: 0,
        },
      },
      selectedBank: {
        AccountNumber: "",
        AccountName: "",
        BankCode: "",
      },
      theme: {
        backgroundColor: "#75B29D",
        backgroundType: "color", 
        backgroundImage: "",
        pattern: "/images/vendor/VendorBg.png" // Default vendor pattern
      },
      storeMetrics: null,
      store: {},
      stor: null,
      discounts: [],
      salesDashboardAnalytics: {
        percent_change: {
          revenue_generated: 0,
          store_visitors: 0,
          total_orders: 0,
          total_sales: 0,
        },
        summary: {
          revenue_generated: 0,
          store_visitors: 0,
          total_orders: 0,
          total_sales: 0,
        },
      },
      selectedTransaction: {},
      walletAnalytics: {
        available_balance: 0,
        clearing_balance: 0,
        orders_in_progress: 0,
        total_earnings: 0,
        total_withdrawn: 0,
      },
      walletTransactions: [],
      kycStatus: null,
      bankAccounts: [],
      businessProduct: [],
      singleStore: {
        address: {
          address_line: "",
          address_line_two: null,
          business_id: "",
          country: "",
          created_at: "",
          id: "",
          province: "",
          shipbubble_address_code: 0,
          updated_at: "",
        },
        business_bank_account_detail: {
          account: "",
          bank: "",
          business_id: "",
          created_at: "",
          id: "",
          identifier: "",
          updated_at: "",
        },
        business_setting: {
          business_id: "",
          created_at: "",
          id: "",
          personalised_settings: {
            background_color: "",
            background_image: "",
            background_state: "",
            background_pattern: "",
            created_at: "",
            id: "",
            updated_at: "",
          },
          shipping_amount: 0,
          shipping_type: "",
          updated_at: "",
        },
        category: "",
        created_at: "",
        email: "",
        id: "",
        name: "",
        order_count: 0,
        phone: "",
        tag: "",
        updated_at: "",
        user_id: "",
      },
      collection: [],


      fetchCollection: async (pageNumber: number, bussinessId: string) => {
        set({ isLoading: true, error: null });

        // 🔍 ENHANCED VALIDATION: Check business ID before API call
        if (!bussinessId || bussinessId === "undefined") {
          console.error("🚫 businessStore.fetchCollection: Invalid business ID:", bussinessId);
          set({ isLoading: false });
          return [];
        }

        try {
          const response = (await Client({
            path: `/collections/get-collections/${bussinessId}?limit=10&page=${pageNumber}`,
            method: "GET",
          })) as AxiosResponse;

          return response.data.data.data || [];
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          console.error("❌ businessStore.fetchCollection: Error fetching collections:", err.message);
          set({ error: err.message });
          return []; // Return empty array instead of undefined
        } finally {
          set({ isLoading: false });
        }
      },
      setCollection: (data: Collections[]) => set({ collection: data }),

      fetchExistingTags: async () => {
        try {
          // Get all business products (we'll aggregate from multiple pages)
          const allProducts: BusinessProduct[] = [];

          // Fetch products from multiple pages to get comprehensive tag list
          for (let page = 1; page <= 4; page++) {
            try {
              const response = (await Client({
                path: `/business/get-all-products?limit=50&page=${page}`,
                method: "GET",
              })) as AxiosResponse;

              const products = response.data.data.data || [];
              allProducts.push(...products);

              // If we get less than 50, we've reached the end
              if (products.length < 50) break;
            } catch (pageError) {
              console.warn(`Failed to fetch page ${page}:`, pageError);
              break;
            }
          }

          // Extract all unique tags
          const allTags = allProducts
            .flatMap(product => {
              if (Array.isArray(product.tag)) {
                return product.tag;
              }
              return [];
            })
            .filter(tag => tag && tag.trim().length > 0)
            .map(tag => tag.trim());

          // Return unique tags sorted alphabetically
          const uniqueTags = [...new Set(allTags)].sort();
          return uniqueTags;

        } catch (error) {
          console.error("Error fetching existing tags:", error);
          return [];
        }
      },

      fetchBusinessById: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          //("id is den => ", id);
          const response = (await Client({
            path: `/business/${id}`,
            method: "GET",
          })) as AxiosResponse;
          //("resoponse id dere => ", response.data);
          return set({
            isLoading: false,
            error: null,
            singleStore: response.data.data,
          });
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },

      fetchBusinessProduct: async (pageNumber: number) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/business/get-all-products?limit=10&page=${pageNumber}`,
            method: "GET",
          })) as AxiosResponse;

          const products = response.data.data.data || [];
          console.log(`📦 fetchBusinessProduct: Fetched ${products.length} products from page ${pageNumber}`);

          // For pagination, we need to work with the paginatedFetcher pattern
          // Just return the data - paginatedFetcher will call setBusinessProducts
          return products;
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          console.error("❌ fetchBusinessProduct error:", err.message);
          handleAxiosError(error);
          set({ error: err.message });
          return [];
        } finally {
          set({ isLoading: false });
        }
      },
      setBusinessProducts: (data: BusinessProduct[]) =>
        set({ businessProduct: data }),

      createBank: async (val: BankData) => {
        //(val);
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: "/business/add-bank-account",
            method: "POST",
            data: val,
          })) as AxiosResponse;
          //(response.data);
          if (response.data.message) {
            //(response.data);
            toast.success("Bank added successfully");
          } else {
            toast.error("Failed to create bank");
          }
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },

      getOtp: async (val: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: "/otp",
            method: "POST",
            data: {
              identifier: val,
              request_type: "forgot_password",
            },
          })) as AxiosResponse;
          if (response.data.message === "successful") {
            //(response.data);
            toast.success("OTP sent successfully");
          } else {
            toast.error("OTP failed to send");
          }
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },

      getBankAccounts: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: "/business/get-bank-accounts",
            method: "GET",
          })) as AxiosResponse;
          const data = response.data.data;
          //("bank accounts, ", data);
          return set({ bankAccounts: data });
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },

      deleteBankAccount: async (bankId: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/business/delete-bank-account/${bankId}`,
            method: "DELETE",
          })) as AxiosResponse;
          if (response.data.message === "successful" || response.data.message) {
            toast.success("Bank account deleted successfully");
            // Refresh bank accounts list
            const bankResponse = (await Client({
              path: "/business/get-bank-accounts",
              method: "GET",
            })) as AxiosResponse;
            set({ bankAccounts: bankResponse.data.data || [] });
          } else {
            toast.error("Failed to delete bank account");
          }
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
          toast.error("Failed to delete bank account");
        } finally {
          set({ isLoading: false });
        }
      },

      setDefaultBankAccount: async (bankId: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/business/update-bank-account/${bankId}`,
            method: "PATCH",
            data: { is_default: true }
          })) as AxiosResponse;
          if (response.data.message) {
            toast.success("Default bank account updated");
            // Refresh bank accounts list
            const bankResponse = (await Client({
              path: "/business/get-bank-accounts",
              method: "GET",
            })) as AxiosResponse;
            set({ bankAccounts: bankResponse.data.data || [] });
          } else {
            toast.error("Failed to set default bank account");
          }
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
          toast.error("Failed to set default bank account");
        } finally {
          set({ isLoading: false });
        }
      },

      withdrawFund: async (data: WalletInterface) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: "/wallet/withdraw",
            method: "POST",
            data,
          })) as AxiosResponse;
          if (response.data.message === "successful") {
            toast.success("Withdrawal request submitted");
            return response.data.data;
          } else {
            const errorMsg = response.data.error || "Failed to withdraw funds";
            toast.error(errorMsg);
            throw new Error(errorMsg);
          }
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          const errorMsg = err.response?.data?.error || err.message || "Withdrawal failed";
          set({ error: errorMsg });
          toast.error(errorMsg);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      fetchWalletTransactions: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: "/wallet/get-wallet-transactions",
            method: "GET",
          })) as AxiosResponse;
          const data = response.data.data.data;
          //("transactions, ", data);
          return set({ walletTransactions: data });
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },
      fetchWalletAnalytics: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: "/wallet/get-wallet-balances",
            method: "GET",
          })) as AxiosResponse;
          const data = response.data;
          return set({ walletAnalytics: data });
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },

      // KYC (KYC1): submit doc+selfie (+type/name/bvn) multipart; fetch own status.
      submitKyc: async (formData: FormData) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: "/kyc/submit",
            method: "POST",
            data: formData,
            contentType: "multipart/form-data",
          })) as AxiosResponse;
          const body = response.data as { data?: KycRecord } & Partial<KycRecord>;
          const kyc = (body?.data ?? body) as KycRecord;
          set({ kycStatus: kyc });
          return kyc;
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          toast.error(err.response?.data?.error || "Failed to submit verification");
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },
      fetchKycStatus: async () => {
        try {
          const response = (await Client({
            path: "/kyc/status",
            method: "GET",
          })) as AxiosResponse;
          const body = response.data as { data?: KycRecord } & Partial<KycRecord>;
          set({ kycStatus: (body?.data ?? body) as KycRecord });
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          // 404 = no KYC record yet (not submitted)
          if (err.response?.status === 404) set({ kycStatus: null });
        }
      },

      setSelectedTransaction: (val: any) => {
        set({ selectedTransaction: val });
      },

      setDiscount: (val: any) => {
        set({ discounts: val });
      },

      fetchDiscount: async (pageNumber: number) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/business/get-discounts?limit=10&page=${pageNumber}&search`,
            method: "GET",
          })) as AxiosResponse;
          return response.data.data.data;
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },
      createDiscount: async (data: CreateCoupon) => {
        set({ isLoading: true, error: null });
        //("data is ", data);
        try {
          const response = (await Client({
            path: "/business/create-discount",
            method: "POST",
            data: data,
          })) as AxiosResponse;

          if (response.data.message === "successful") {
            toast.success("Coupon created discount.");
          } else {
            toast.error("Failed to create discount.");
          }
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
          toast.error(
            err.response?.data?.error || "Failed to create doscount."
          );
        } finally {
          set({ isLoading: false });
        }
      },

      fetchStoreStats: async (businessId: string) => {
        set({ isLoading: true, error: null });
        try {
          // W2.5: cache per business so dashboard re-mounts within staleTime
          // (60s) reuse the result instead of refetching on 3G.
          const data = await getQueryClient().fetchQuery({
            queryKey: ["store-analytics", businessId],
            queryFn: async () => {
              const response = await Client<{ data: StoreStats }>({
                path: `/business/get-store-analytics/${businessId}`,
                method: "GET",
              });
              return response.data.data;
            },
          });
          return set({ storeStats: data });
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },

      fetchSalesDashboardAnalytics: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await getQueryClient().fetchQuery({
            queryKey: ["dashboard-analytics"],
            queryFn: async () => {
              const response = await Client<{ data: SalesDashboardAnalytics }>({
                path: "/business/get-dashboard-analytics",
                method: "GET",
              });
              return response.data.data;
            },
          });
          return set({ salesDashboardAnalytics: data });
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },

      setFollowedBusinessess: (val: FollowedBusiness[]) => {
        set({ followedBusinesses: val });
      },

      fetchFollowedBusinessess: async (pageNumber: number) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/users/get-following?limit=10&page=${pageNumber}`,
            method: "GET",
          })) as AxiosResponse;
          return response.data.data.data;
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },

      // Set the current store data
      setStore: (data: StoreData, isMarketplace = true) => {
        // For marketplace views, only update stor (viewing store)
        // For seller views, update both store and stor
        if (isMarketplace) {
          set({ stor: data });
        } else {
          set({ store: data, stor: data });
        }
      },
      setStoreMetrics: (data: BusinessStatsResponse) =>
        set({ storeMetrics: data }),

      fetchCustomersRanking: async (pageNumber: number) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/business/get-customers?limit=10&page=${pageNumber}`,
            method: "GET",
          })) as AxiosResponse;
          const data = response.data.data.data;
          set({ customerranking: data });
          return data;
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },
      setCustomerRanking: (data: CustomerRanking[]) =>
        set({ customerranking: data }),
      fetchProductRanking: async (pageNumber: number) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/business/get-product-ranking?limit=20&page=${pageNumber}`,
            method: "GET",
          })) as AxiosResponse;
          return response.data.data.data;
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },
      setProductRanking: (data: ProductRanking[]) =>
        set({ productrakings: data }),
      fetchSalesAnalytics: async (date: string) => {
        set({ isLoading: true, error: null });
        try {
          const data = await getQueryClient().fetchQuery({
            queryKey: ["sales-analytics", date],
            queryFn: async () => {
              const response = await Client<{ data: SaleAnalytics }>({
                path: `/business/get-sales-analytics?date=${date}`,
                method: "GET",
              });
              return response.data.data;
            },
          });
          return set({ sales: data });
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },
      setSalesAnalytics: (data: SaleAnalytics) => set({ sales: data }),
      fetchCustomerAnalytics: async (date: string) => {
        set({ isLoading: true, error: null });
        try {
          const data = await getQueryClient().fetchQuery({
            queryKey: ["customer-analytics", date],
            queryFn: async () => {
              const response = await Client<{ data: CustomerAnalytics }>({
                path: `/business/get-customer-analytics?date=${date}`,
                method: "GET",
              });
              return response.data.data;
            },
          });
          return set({ customer: data });
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },
      setCustomerAnalytics: (data: CustomerAnalytics) =>
        set({ customer: data }),

      // Add a new store
      addStore: async (
        storePayload: BusinessPayloadData,
        callback?: () => void
      ) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: "/business",
            method: "POST",
            data: storePayload,
            contentType: storePayload instanceof FormData ? "multipart/form-data" : "application/json",
          })) as AxiosResponse;

          if (response.data.message === "successful") {
            const data = response.data.data;
            Cookies.set("store", data, { expires: 7 });

            set({ store: data });
            set({
              theme: {
                backgroundColor:
                  data.business_setting?.personalised_settings
                    ?.background_color,
                backgroundImage:
                  data.business_setting?.personalised_settings
                    ?.background_image,

                backgroundType:
                  data.business_setting?.personalised_settings
                    ?.background_state,
              },
            });
            
            // Toast removed - handled by seller page

            // CRITICAL FIX: Update user business data directly from creation response
            // This avoids timing issues with the separate /business API endpoint for fresh accounts
            console.log("🔄 Updating user business data directly from creation response...");

            // Use dynamic import to avoid circular dependencies
            const authStore = (await import("@/store/authStore")).default;
            const currentUser = authStore.getState().user;

            if (currentUser && data) {
              // Update user state with the newly created business data directly
              console.log("✅ Updating user business state directly:", {
                businessId: data.id,
                businessName: data.name,
                businessTag: data.tag
              });

              // Use the setUser method to update the user with business data
              const updatedUser = {
                ...currentUser,
                business: {
                  id: data.id,
                  name: data.name,
                  tag: data.tag,
                  logo: data.logo,
                  category: data.category,
                  email: data.email,
                  phone: data.phone,
                  address: data.address,
                  business_setting: data.business_setting,
                  // Include all business fields from the response
                  ...data
                }
              };

              // Update the auth store with the new business data using set method
              authStore.setState({ user: updatedUser });

              console.log("✅ User business data updated successfully from creation response");

              // Call success callback immediately since we have the data
              if (callback) {
                console.log("✅ Store creation complete, triggering navigation...");
                callback();
              }

              return; // Exit early with direct success
            }

            // FALLBACK: the create response didn't carry the business. Fetch it
            // deterministically with a single /me call (W2.7 — replaces the old
            // 3x retry + 5s extended-delay loop). The store exists once create
            // returns 200, so one read populates user.business + store/theme.
            await authStore.getState().getMe();

            if (!authStore.getState().user?.business?.id) {
              console.warn("Store created but /me returned no business yet");
            }

            if (callback) {
              callback();
            }
          } else {
            toast.error("Failed to create store.");
          }
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
          toast.error(err.response?.data?.error || "Failed to create store.");
        } finally {
          set({ isLoading: false });
        }
      },

      setBanks: (val: Banks[]) => {
        set({ banks: val });
      },

      fetchBanks: async (pageNumber: number) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/bank/get-banks?limit=300&page=${pageNumber}`,
            method: "GET",
          })) as AxiosResponse;
          const banksData = response.data.data;
          set({ banks: banksData });
          return banksData;
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },

      validateBank: async (val: {
        account_number: string;
        bank_code: string;
      }) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: "/bank/validate-bank-account",
            method: "POST",
            data: val,
          })) as AxiosResponse;
          //(response.data);

          set({ selectedBank: response.data.data });
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },

      // Fetch all stores
      fetchStores: async () => {
        set({ isLoading: true, error: null });
        try {
          // W2.5: dedupe the 500-row catalog pull across the ~11 routes that
          // call this on mount. fetchQuery returns the shared cached result
          // within staleTime (60s) instead of re-hitting the network — a big
          // win on 3G. All existing callers stay unchanged.
          const stores = await getQueryClient().fetchQuery({
            queryKey: ["stores"],
            queryFn: async () => {
              const response = await Client<{ data?: { data?: StoreData[] } }>({
                path: "/businesses?limit=500",
                method: "GET",
              });
              return unwrap<StoreData[]>(response.data, []);
            },
          });
          set({ stores });
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message, stores: [] });
          handleAxiosError(error);
        } finally {
          set({ isLoading: false });
        }
      },

      // Fetch stores by search term (for buyer mode)
      fetchStoresBySearch: async (search: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/businesses?search=${encodeURIComponent(search)}`,
            method: "GET",
          })) as AxiosResponse;

          const stores = response.data.data?.data || [];
          set({ stores: stores });

          // If we found stores, find exact match by tag or name
          if (stores.length > 0) {
            // FIXED: Use exact match instead of partial match to prevent store confusion
            const matchingStore = stores.find((s: any) =>
              s.tag?.toLowerCase() === search.toLowerCase() ||     // Try tag first (preferred)
              s.name?.toLowerCase() === search.toLowerCase()       // Fallback to exact name match
            );

            if (matchingStore) {
              get().setStore(matchingStore, true); // true = marketplace mode
            } else {
              // FIXED: Handle store not found - prevents empty/wrong store display
              set({ stor: null, error: 'Store not found' });
              console.warn(`Store not found for search: "${search}"`);
            }
          } else {
            // FIXED: No stores returned from API
            set({ stor: null, error: 'Store not found' });
          }
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message, stores: [], stor: null });
          handleAxiosError(error);
        } finally {
          set({ isLoading: false });
        }
      },

      // Fetch a Background settings
      getThemeSettings: async (id: string) => {
        set({ isLoadingTheme: true, error: null });
        try {
          const response = (await Client({
            path: `/business/${id}/background`,
            method: "GET",
          })) as AxiosResponse;
          return response.data.data;
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },

      updateThemeColor: async ({ id, payload, callback }: UpdateThemeProps) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/business/${id}/background/color`,
            method: "PUT",
            data: payload,
          })) as AxiosResponse;
          toast.success("Theme updated successfully!");
          if (callback) {
            callback();
          }
          return response.data?.data;
        } catch (error) {
          handleAxiosError(error);
          const errorMessage = "Failed to update theme color";
          set({ error: errorMessage });
          toast.error(errorMessage);
        } finally {
          set({ isLoading: false });
        }
      },
      updateBackgroundImage: async (
        id: string,
        payload: FormData,
        callback?: () => void
      ) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/business/${id}/background/image`,
            method: "POST",
            data: payload,
            contentType: "multipart/form-data",
          })) as AxiosResponse;

          toast.success("Theme updated successfully!");
          if (callback) {
            callback();
          }
          return response.data?.data;
        } catch (error) {
          handleAxiosError(error);
          const errorMessage = "Failed to update background image";
          set({ error: errorMessage });
          toast.error(errorMessage);
        } finally {
          set({ isLoading: false });
        }
      },

      getStoreById: async (id: string | undefined) => {
        if (!id) {
          console.warn("⚠️ getStoreById called without ID");
          return;
        }

        set({ isLoading: true, error: null });
        try {
          console.log("🔍 getStoreById: Looking for business ID:", id);
          
          // First try to find the business in the existing stores list
          const currentStores = get().stores;
          let targetBusiness = currentStores.find((business: any) => business.id === id);
          
          if (!targetBusiness) {
            console.log("🔍 Business not found in current stores, fetching fresh data...");
            // If not found, fetch fresh business data
            const response = (await Client({
              path: `/businesses`,
              method: "GET",
            })) as AxiosResponse;
            
            const businesses = response.data.data?.data || [];
            targetBusiness = businesses.find((business: any) => business.id === id);
            
            if (!targetBusiness) {
              console.error("❌ Business not found with ID:", id);
              set({ error: `Business not found with ID: ${id}` });
              return;
            }
          }

          console.log("✅ Found business:", {
            id: targetBusiness.id,
            name: targetBusiness.name,
            hasLogo: !!targetBusiness.logo,
            hasAddress: !!targetBusiness.address,
            addressLine: targetBusiness.address?.address_line
          });

          set({ store: targetBusiness });
          set({
            theme: {
              backgroundColor:
                targetBusiness?.business_setting?.personalised_settings
                  ?.background_color || "#3AC61E",
              backgroundImage:
                targetBusiness?.business_setting?.personalised_settings
                  ?.background_image,

              backgroundType:
                targetBusiness?.business_setting?.personalised_settings
                  ?.background_state,
              pattern: "/pattern1.svg",
            },
          });
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          console.error("❌ Error in getStoreById:", err.message);
          handleAxiosError(error);
        } finally {
          set({ isLoading: false });
        }
      },

      // W2.7: deterministic bootstrap of the authenticated seller's store.
      // Delegates to authStore.getMe (single /users/me call) which returns the
      // business and calls hydrateFromBusiness below — no separate /business
      // fetch. Kept as a named action so existing callers stay unchanged.
      getAuthenticatedUserStore: async () => {
        set({ isLoading: true, error: null });
        try {
          const authStore = (await import("@/store/authStore")).default;
          await authStore.getState().getMe();
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          console.error("❌ Error in getAuthenticatedUserStore:", err.message);
          handleAxiosError(error);
        } finally {
          set({ isLoading: false });
        }
      },

      // Pure setter: mirror a business object into store/stor + theme. Called by
      // authStore.getMe so a single /me response hydrates the storefront theme
      // without a second /business round-trip (W2.7). Null business (a buyer
      // with no store) clears the store rather than erroring.
      hydrateFromBusiness: (business) => {
        if (!business) {
          set({ stor: null, store: null });
          return;
        }
        set({
          stor: business,
          store: business,
          theme: {
            backgroundColor:
              business?.business_setting?.personalised_settings
                ?.background_color || "#75B29D",
            backgroundImage:
              business?.business_setting?.personalised_settings
                ?.background_image || "",
            backgroundType:
              business?.business_setting?.personalised_settings
                ?.background_state || "color",
            pattern:
              business?.business_setting?.personalised_settings
                ?.background_pattern || "",
          },
        });
      },

      getStoreMetrics: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/business/metrics/${id}`,
            method: "GET",
          })) as AxiosResponse;

          set({ storeMetrics: response.data.data });
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },

      // Update an existing store
      updateStore: async (
        id?: string | undefined,
        storePayload?: BusinessPayloadData,
        callback?: () => void
      ) => {
        set({ isLoading: true, error: null });
        try {
          if (!id) {
            throw new Error("ID is required");
          }

          const response = (await Client({
            path: `/business/${id}`,
            method: "PUT",
            data: storePayload,
            contentType: storePayload instanceof FormData ? "multipart/form-data" : "application/json",
          })) as AxiosResponse;

          toast.success("Store updated successfully");
          if (response.data.data?.logo) {
            console.log("✅ Logo updated:", response.data.data.logo);
          }
          set({ store: response.data.data });
          set({
            theme: {
              backgroundColor:
                response.data?.data?.business_setting?.personalised_settings
                  ?.background_color || "#3AC61E",
              backgroundImage:
                response.data?.data?.business_setting?.personalised_settings
                  ?.background_image,
              backgroundType:
                response.data?.data?.business_setting?.personalised_settings
                  ?.background_state,
              pattern: "/pattern1.svg",
            },
          });
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
          // Provide user-friendly error feedback
          const errorMessage = err.response?.data?.error || err.message || "Failed to update store details";
          toast.error(errorMessage);
        } finally {
          set({ isLoading: false });
          if (callback) {
            callback();
          }
        }
      },

      // Two-source shipping config — dedicated endpoint so it can't clobber theme
      // / legacy shipping fields (see backend UpdateShippingSettings).
      updateShippingSettings: async (id, payload, callback) => {
        set({ isLoading: true, error: null });
        try {
          await Client({
            path: `/business/${id}/shipping`,
            method: "PUT",
            data: payload,
          });
          toast.success("Shipping settings saved");
          if (callback) callback();
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          const errorMessage =
            err.response?.data?.error ||
            err.message ||
            "Failed to save shipping settings";
          set({ error: errorMessage });
          toast.error(errorMessage);
        } finally {
          set({ isLoading: false });
        }
      },

      clearStoreState: () => {
        set({
          isLoading: false,
          isLoadingTheme: false,
          error: null,
          stores: [],
          followedBusinesses: [],
          collection: [],
              theme: {},
          storeMetrics: null,
          store: {},
          stor: null,
          discounts: [],
          sales: {
            percent_change: {
              active_orders: 0,
              average_order_value: 0,
              cancelled_orders: 0,
              store_visitors: 0,
              total_orders: 0,
              total_sales: 0,
            },
            summary: {
              active_orders: 0,
              average_order_value: 0,
              cancelled_orders: 0,
              store_visitors: 0,
              total_orders: 0,
              total_sales: 0,
            },
          },
          storeStats: {
            avg_delivery_time: 0,
            avg_order_prep_time: 0,
            followers_count: 0,
            fulfilment_rate: 0,
            products_sold: 0,
            ratings: 0,
          },
          productrakings: [],
          walletTransactions: [],
          customerranking: [],
          bankAccounts: [],
          customer: {
            percent_change: {
              active_customers: 0,
              average_customer_value: 0,
              inactive_customers: 0,
              new_customers: 0,
              returning_customers: 0,
            },
            summary: {
              active_customers: 0,
              average_customer_value: 0,
              inactive_customers: 0,
              new_customers: 0,
              returning_customers: 0,
            },
          },
          walletAnalytics: {
            available_balance: 0,
            clearing_balance: 0,
            orders_in_progress: 0,
            total_earnings: 0,
            total_withdrawn: 0,
          },
          singleStore: {
            address: {
              address_line: "",
              address_line_two: null,
              business_id: "",
              country: "",
              created_at: "",
              id: "",
              province: "",
              shipbubble_address_code: 0,
              updated_at: "",
            },
            business_bank_account_detail: {
              account: "",
              bank: "",
              business_id: "",
              created_at: "",
              id: "",
              identifier: "",
              updated_at: "",
            },
            business_setting: {
              business_id: "",
              created_at: "",
              id: "",
              personalised_settings: {
                background_color: "",
                background_image: "",
                background_state: "",
                background_pattern: "",
                created_at: "",
                id: "",
                updated_at: "",
              },
              shipping_amount: 0,
              shipping_type: "",
              updated_at: "",
            },
            category: "",
            created_at: "",
            email: "",
            id: "",
            name: "",
            order_count: 0,
            phone: "",
            tag: "",
            updated_at: "",
            user_id: "",
          },
          selectedTransaction: {},
              banks: [],
          selectedBank: {
            AccountNumber: "",
            AccountName: "",
            BankCode: "",
          },
          salesDashboardAnalytics: {
            percent_change: {
              revenue_generated: 0,
              store_visitors: 0,
              total_orders: 0,
              total_sales: 0,
            },
            summary: {
              revenue_generated: 0,
              store_visitors: 0,
              total_orders: 0,
              total_sales: 0,
            },
          },
        });
      },
    }),
    {
      name: "business-store-v3", // Updated version to clear old problematic cache
      storage: createJSONStorage(() => createQuotaSafeStorage()),
      partialize: () => ({
        // NOTE (W2.3): the previous list referenced selectedBusinessId, which does
        // not exist on BusinessState, so it persisted nothing useful. Only reset
        // transient flags on rehydration; revisit whether this store needs persist.
        isLoading: false,
        error: null,
      }),
    }
  )
);

export default useBusinessStore;
