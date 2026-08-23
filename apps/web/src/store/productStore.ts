/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from "@/lib/client";
import { ProductData, ProductPayloadData, VariantCombination } from "@/lib/types";
import { handleAxiosError } from "@/lib/utils";
import { calculateAllCombinations, calculateSelectedVariant } from "@/utils/variantCalculations";
import { AxiosError } from "axios";
import { AxiosResponse } from "axios";
import { toast } from "sonner";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import createQuotaSafeStorage from "@/utils/quotaSafeStorage";

interface ProductResponse {
  data?: ProductData[];
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

interface Product {
  business_id: string;
  category: Category;
  category_id: string;
  created_at: string;
  description: string;
  discount: number;
  height: number;
  id: string;
  image: string[];
  is_combination: boolean;
  length: number;
  old_price: number;
  price: number;
  sku: string;
  slug: string;
  status: string;
  stock: number;
  tag: string[];
  title: string;
  updated_at: string;
  user_id: string;
  weight: number;
  width: number;
}

interface WishlistData {
  created_at: string;
  id: string;
  product: Product;
  product_id: string;
  updated_at: string;
  user_id: string;
}

interface Address {
  address_line: string;
  address_line_two: string | null;
  business_id: string;
  country: string;
  created_at: string;
  id: string;
  province: string;
  shipbubble_address_code: number;
  updated_at: string;
}

interface PersonalisedSettings {
  background_color: string;
  background_image: string;
  background_state: string;
  created_at: string;
  id: string;
  updated_at: string;
}

interface BusinessSetting {
  business_id: string;
  created_at: string;
  id: string;
  personalised_settings: PersonalisedSettings;
  shipping_amount: number;
  shipping_type: string;
  updated_at: string;
}

interface Business {
  address: Address;
  business_bank_account_detail: string | null;
  business_setting: BusinessSetting;
  category: string;
  created_at: string;
  email: string;
  id: string;
  name: string;
  phone: string;
  tag: string;
  updated_at: string;
  user_id: string;
}

interface ProductRating {
  comment: string;
  created_at: string;
  id: string;
  is_blocked: boolean;
  product_id: string;
  rate: number;
  updated_at: string;
  user_id: string;
}

export interface Products {
  business_id: string;
  category: Category;
  category_id: string;
  created_at: string;
  description: string;
  discount: number;
  height: number;
  id: string;
  image: string[];
  is_combination: boolean;
  length: number;
  original_price: number;
  old_price: number;
  price: number;
  product_rating: ProductRating[];
  sales: number;
  slug: string;
  status: string;
  stock: number;
  tag: string[];
  title: string;
  updated_at: string;
  user_id: string;
  weight: number;
  width: number;
}

interface Recent {
  business: Business;
  business_id: string;
  created_at: string;
  id: string;
  products: Products[];
}

interface ProductState {
  isLoading: boolean;
  error: string | null;
  recentProduct: {
    business: string;
    products: ProductData[];
    id: string;
  }[];
  recent: Recent[];
  spotlightProduct: WishlistData[];
  product: ProductData;
  productPreview: ProductData | any;
  products: ProductData[];
  sellerProducts: ProductData[];
  setLoading: (val: boolean) => void;
  setProduct: (data: ProductData) => void;
  setRecentProduct: (
    data: {
      business: string;
      products: ProductData[];
      id: string;
    }[]
  ) => void;
  setAllProducts: (data: any) => void;
  fetchAllProduct: (page: number) => Promise<void>;
  setSpotlightProduct: (data: WishlistData[]) => void;
  setProductPreview: (data: ProductData) => void;
  addProduct: (
    productPayload: ProductPayloadData,
    callback?: () => void
  ) => Promise<void>;
  addRecentViewed: (data: any, callback?: () => void) => Promise<void>;
  addWishlist: (data: string, callback?: () => void) => Promise<void>;
  getProductById: (
    id: string | string[],
    user?: "buy" | "sell"
  ) => Promise<void>;
  getProductByIds: (id: string) => any;
  fetchProducts: (param?: string) => Promise<void>;
  fetchAllProducts: () => Promise<void>;
  fetchRecentlyViewedBusiness: () => Promise<void>;
  fetchWishlist: () => Promise<void>;
  updateProduct: (id: string, productPayload: ProductData) => Promise<Partial<ProductData>>;
  clearProductState: () => void;
  rateProduct: (ratingPayload: {
    user_id: string;
    product_id: string;
    comment: string;
    rate: number;
  }) => void;
  fetchRegisterOtp: (val: {
    identifier: string;// email or phone
  }) => Promise<void>;
  fetchWithdrawOtp: () => Promise<void>;
  verifyOtpSent: (val: VerifyOtpInterface) => Promise<void>;
  calculateProductCombinations: (product: ProductData) => VariantCombination[];
  calculateVariantSelection: (product: ProductData, selection: { [variantName: string]: string }) => VariantCombination | null;
}

export interface VerifyOtpInterface {
  identifier: string;
  otp: string;
  verification_type: "register_otp" | "withdrawal_otp";
}

const useProductStore = create<ProductState>()(
  persist(
    (set) => ({
      isLoading: false,
      error: null,
      products: [],
      sellerProducts: [],
      recent: [],
      recentProduct: [],
      spotlightProduct: [],
      product: {},
      productPreview: {},

      // Set the current product data
      setProduct: (data: ProductData) => set({ product: data }),
      setRecentProduct: (
        data: {
          business: string;
          products: ProductData[];
          id: string;
        }[]
      ) => set({ recentProduct: data }),
      setSpotlightProduct: (data: WishlistData[]) =>
        set({ spotlightProduct: data }),
      setProductPreview: (data: ProductData) => set({ productPreview: data }),

      // Add a new product
      addProduct: async (
        productPayload: ProductPayloadData,
        callback?: () => void
      ) => {
        console.log(productPayload);
        set({ isLoading: true, error: null });
        try {
          const response = await Client({
            path: "/products",
            method: "POST",
            data: productPayload,
          }) as AxiosResponse;

          // Add the new product to local state immediately
          const newProduct = response.data.data;
          if (newProduct) {
            set((state) => ({
              products: [newProduct, ...state.products],
              sellerProducts: [newProduct, ...state.sellerProducts],
            }));

            // CRITICAL: Refresh products from backend to ensure complete sync
            // This prevents the "products not showing immediately after creation" issue
            console.log("🔄 Refreshing products list after creation...");

            try {
              // Get the current business ID to fetch products
              const authStore = (await import("@/store/authStore")).default;
              const businessId = authStore.getState().user?.business?.id;

              if (businessId) {
                // Fetch fresh products list from backend
                const freshProductsResponse = await Client({
                  path: `/products?business_id=${businessId}`,
                  method: "GET",
                }) as AxiosResponse;

                const freshProducts = freshProductsResponse.data?.data?.data || [];
                console.log(`✅ Fetched ${freshProducts.length} products for business ${businessId}`);

                // Update state with fresh products list
                set({
                  products: freshProducts,
                  sellerProducts: freshProducts,
                });

                // Also update the business store's product count if available
                const businessStore = (await import("@/store/businessStore")).default;
                const currentStore = businessStore.getState().store;
                if (currentStore) {
                  businessStore.getState().setStore({
                    ...currentStore,
                    product_count: freshProducts.length
                  });
                }

                console.log("✅ Products list refreshed successfully");
              } else {
                console.warn("⚠️ No business ID found, skipping product refresh");
              }
            } catch (error) {
              console.error("❌ Failed to refresh products after creation:", error);
              // Don't block on refresh failure - local state update is sufficient
            }
          }

          toast.success("Product created successfully!");

          // Call callback after all updates complete
          if (callback) {
            callback();
          }
        } catch (error) {
          set({ error: (error as Error).message });
          handleAxiosError(error);
        } finally {
          set({ isLoading: false });
        }
      },

      fetchRegisterOtp: async (val) => {
        console.log(val);
        set({ isLoading: true, error: null });
        try {
          await Client({
            path: "/verification-code/send-register-otp",
            method: "POST",
            data: val,
          }).then((response) => response as ProductResponse);
          toast.success("Otp sent successfully check your email!");
        } catch (error) {
          set({ error: (error as Error).message });
          handleAxiosError(error);
        } finally {
          set({ isLoading: false });
        }
      },
      fetchWithdrawOtp: async () => {
        set({ isLoading: true, error: null });
        try {
          await Client({
            path: "/verification-code/send-withdrawal-request-otp",
            method: "POST",
          }).then((response) => response as ProductResponse);
          toast.success("Otp sent successfully check your email!");
        } catch (error) {
          set({ error: (error as Error).message });
          handleAxiosError(error);
        } finally {
          set({ isLoading: false });
        }
      },

      verifyOtpSent: async (payload) => {
        console.log(payload);
        set({ isLoading: true, error: null });
        try {
          await Client({
            path: "/verification-code/validate-code",
            method: "POST",
            data: payload,
          }).then((response) => response as ProductResponse);
          toast.success("Otp verified!");
        } catch (error) {
          set({ error: (error as Error).message });
          handleAxiosError(error);
        } finally {
          set({ isLoading: false });
        }
      },

      setLoading: (val: boolean) => {
        set({ isLoading: val });
      },

      // Fetch all products
      fetchAllProduct: async (page: number) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/products?page=${page}&limit=10`,
            method: "GET",
          })) as AxiosResponse;

          set({
            isLoading: false,
          });
          console.log('fetching data => ',response.data.data)
          return response.data.data.data;
        } catch (error) {
          set({ error: (error as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },
      setAllProducts: (data: any) => {
        set({ products: data, sellerProducts: data });
      },

      fetchAllProducts: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/products?limit=250`,
            method: "GET",
          })) as AxiosResponse;

          const allProducts = response.data.data.data || [];

          set({
            products: allProducts,
            sellerProducts: allProducts,
            isLoading: false,
          });
        } catch (error) {
          console.error("Error fetching products:", error);
          set({ error: (error as Error).message, products: [], sellerProducts: [] });
        } finally {
          set({ isLoading: false });
        }
      },

      fetchProducts: async (business_id: string = "") => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/products?business_id=${business_id}`,
            method: "GET",
          })) as AxiosResponse;

          set({
            products: response.data.data.data,
            sellerProducts: response.data.data.data,
            isLoading: false,
          });
        } catch (error) {
          set({ error: (error as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },

      fetchRecentlyViewedBusiness: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: "/business/get-user-recently-viewed-businesses",
            method: "GET",
          })) as AxiosResponse;

          set({
            recent: response.data.data.data,
            isLoading: false,
          });
        } catch (error) {
          set({ error: (error as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },

      addRecentViewed: async (data: any, callback?: () => void) => {
        set({ isLoading: true, error: null });
        try {
          await Client({
            path: "/business/add-recently-viewed-businesses",
            method: "POST",
            data: data,
          }).then((response) => response as ProductResponse);

          if (callback) {
            callback();
          }
        } catch (error) {
          set({ error: (error as Error).message });
          handleAxiosError(error);
        } finally {
          set({ isLoading: false });
        }
      },

      fetchWishlist: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: "/products/get-user-wishlist?limit=10&page=1",
            method: "GET",
          })) as AxiosResponse;

          set({
            spotlightProduct: response.data.data.data,
            isLoading: false,
          });
        } catch (error) {
          set({ error: (error as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },

      addWishlist: async (data: string, callback?: () => void) => {
        set({ isLoading: true, error: null });
        try {
          await Client({
            path: `/products/add-wishlist/${data}`,
            method: "POST",
          }).then((response) => response as ProductResponse);

          if (callback) {
            callback();
          }
          toast.success("Product added to wishlist successfully!");
        } catch (error) {
          set({ error: (error as Error).message });
          handleAxiosError(error);
        } finally {
          set({ isLoading: false });
        }
      },

      getProductById: async (
        id: string | string[],
        user: "buy" | "sell" = "buy"
      ) => {
        console.log('🚀🚀🚀 PRODUCTSTORE GETPRODUCTBYID CALLED WITH:', { user, id });
        console.log('🔥 FUNCTION EXECUTION CONFIRMED - V4 Cache Reset Successful');
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path:
              user === "buy"
                ? `/products/${id}`
                : `/business/get-product/${id}`,
            method: "GET",
          })) as AxiosResponse;
          //("setting id passed => ", response.data);
          console.log('🔧 ProductStore API Response:', response.data);
          // Extract both product and combinations data from API response
          const responseData = response.data.data;

          // For public endpoints: {data: {product: {...}, combinations: [...]}}
          // For business endpoints: {data: {...}} (direct product object)
          const productData = responseData.product ? responseData.product : responseData;
          const combinations = responseData.combinations || [];

          console.log('🔧 ProductStore response structure:', {
            'responseData': Object.keys(responseData),
            'has responseData.product': !!responseData.product,
            'has responseData.combinations': !!responseData.combinations,
            'selected productData source': responseData.product ? 'responseData.product' : 'responseData'
          });

          console.log('🔧 ProductStore extracted data:', {
            'productData.variants': productData?.variants,
            'productData has variants': !!productData?.variants,
            'variants length': productData?.variants?.length,
            'combinations': combinations
          });

          // Add combinations to product data if available
          const productWithCombinations = {
            ...productData,
            variant_combinations: combinations
          };

          console.log('🔧 ProductStore final product:', {
            'productWithCombinations.variants': productWithCombinations?.variants,
            'has variants after spread': !!productWithCombinations?.variants
          });

          set({ product: productWithCombinations });
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },
      getProductByIds: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/business/get-product/${id}`,
            method: "GET",
          })) as AxiosResponse;

          console.log('🌐 API Response for product:', {
            status: response.status,
            data: response.data.data
          });

          const data = response.data.data;
          return data.product || data;
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          console.error('❌ Failed to fetch product:', err.message, err.response?.status);
          set({ error: err.message });
          throw error; // Re-throw to trigger fallback in component
        } finally {
          set({ isLoading: false });
        }
      },

      // Update an existing product
      updateProduct: async (id: string, productPayload: ProductData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await Client<{ data?: Partial<ProductData>; message?: string }>({
            path: `/products/${id}`,
            method: "PUT",
            data: productPayload,
          });

          // 🔍 DEBUG: Log the complete response structure
          console.log("🔍 RAW RESPONSE STRUCTURE:", {
            'response': response,
            'response.status': response.status,
            'response.data': response.data,
            'response.data.data': response.data?.data,
            'response.data.message': response.data?.message
          });

          // Fix: Access the nested data structure correctly
          const updatedProductData: Partial<ProductData> = response.data?.data ?? {};

          console.log("🔍 EXTRACTED PRODUCT DATA:", updatedProductData);

          set((state) => ({
            products: state.products.map((product) =>
              product.id === id
                ? { ...updatedProductData, id: product.id }
                : product
            ),
            // 🔧 CRITICAL FIX: Also update the single product if it matches the updated product ID
            product: state.product?.id === id
              ? { ...updatedProductData, id }
              : state.product
          }));

          // Removed auto-redirect toast - let the component handle success messages
          console.log("✅ Product updated successfully in store");

          // Return the updated product data for the caller
          return updatedProductData;
        } catch (error) {
          console.error("❌ Product update failed:", error);
          set({ error: (error as Error).message });
          handleAxiosError(error);
          throw error; // Re-throw to allow caller to handle
        } finally {
          set({ isLoading: false });
        }
      },

      // Add the function to your Zustand store
      rateProduct: async (ratingPayload: {
        user_id: string;
        product_id: string;
        comment: string;
        rate: number;
      }) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/products/rating`,
            method: "POST",
            data: ratingPayload,
          })) as AxiosResponse;

          // Reflect the review locally so both the order list + detail flip to
          // the "already rated" state immediately — keep the user's review in
          // product_rating (replacing any prior one) so the UI can find it.
          set((state) => ({
            products: state.products.map((product) => {
              if (product.id !== ratingPayload.product_id) return product;
              const others = (product.product_rating || []).filter(
                (r: { user_id?: string }) => r.user_id !== ratingPayload.user_id
              );
              return {
                ...product,
                rating: response.data.data,
                product_rating: [
                  ...others,
                  {
                    user_id: ratingPayload.user_id,
                    rate: ratingPayload.rate,
                    comment: ratingPayload.comment,
                  },
                ],
              };
            }),
          }));

          toast.success("Product rated successfully!");
        } catch (error) {
          set({ error: (error as Error).message });
          handleAxiosError(error);
        } finally {
          set({ isLoading: false });
        }
      },

      // Variant calculation methods using the new property ownership system
      calculateProductCombinations: (product: ProductData) => {
        return calculateAllCombinations(product);
      },

      calculateVariantSelection: (product: ProductData, selection: { [variantName: string]: string }) => {
        return calculateSelectedVariant(product, selection);
      },

      clearProductState: () => {
        set({
          isLoading: false,
          error: null,
          products: [],
          sellerProducts: [],
          recent: [],
          recentProduct: [],
          spotlightProduct: [],
          product: {},
          productPreview: {},
        });
      },
    }),
    {
      name: "product-v4", // Force complete cache reset for variant fix
      storage: createJSONStorage(() => createQuotaSafeStorage()),
      partialize: () => ({
        // Nothing large is worth persisting here (products carry images, working
        // data is refetchable). Only reset transient flags on rehydration.
        // NOTE (W2.3): the previous field list referenced filter state
        // (searchQuery/currentPage/…) that does not exist on ProductState, so it
        // persisted nothing useful. Revisit whether this store needs persist at all.
        isLoading: false,
        error: null,
      }),
    }
  )
);

export default useProductStore;
