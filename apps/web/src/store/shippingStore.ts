/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from "@/lib/client";
import { AxiosResponse } from "axios";
import { toast } from "sonner";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { generateRandomHexId } from "@/lib/generator";

interface ShippingUser {
  [x: string]: string;
  created_at: string;
  firstname: string;
  id: string;
  lastname: string;
  phone: string;
  shipping_address_id: string;
  updated_at: string;
  email: string;
}

interface ShippingAddress {
  country: string;
  created_at: string;
  id: string;
  is_default: boolean;
  latitude: number;
  longitude: number;
  shipbubble_address_code: number;
  shipping_user: ShippingUser;
  state: string;
  street: string;
  town: string;
  updated_at: string;
  user_id: string;
  carrier?: string;
}

interface ShippingOptions {
  product_id: string;
  quantity: number;
  street: string;
  town: string;
  state: string;
  country: string;
  shipping_user: {
    firstname: string;
    lastname: string;
    phone: string;
    email: string;
  };
}

interface Discount {
  discounted: number;
  percentage: number;
  symbol: string;
}

interface Insurance {
  code: string;
  fee: number;
}

interface ProviderData {
  address_code: number;
  courier_id: string;
  courier_image: string;
  courier_name: string;
  discount: Discount;
  insurance: Insurance;
  rate_card_amount: number;
  service_code: string;
  service_type: string;
  // Shipping D: rich fields now carried from the backend for the options card.
  // Optional — a courier option carries the courier_*/eta/badge fields; a Self
  // option carries self/zone/rate. The card reads whichever are present.
  delivery_eta?: string;
  delivery_eta_time?: string;
  on_demand?: boolean;
  is_cod_available?: boolean;
  tracking_level?: number;
  currency?: string;
  self?: boolean;
  zone?: string;
  seller_state?: string;
  rate?: number;
}

export interface ShippingOptionInfo {
  id: string;
  created_at: string;
  updated_at: string;
  provider: string;
  provider_id: string;
  provider_data: ProviderData[];
  delivery_type: string;
  description: string;
  delivery_days: string;
  price: string;
}

interface ShippingState {
  isLoading: boolean;
  error: string | null;
  shippingDetails: ShippingAddress[];
  singleShippingDetails: ShippingAddress;
  shippingOptions: ShippingOptionInfo[];
  selectedDeliveryLocation?: {
    street: string;
    town: string;
    state: string;
    country: string;
    full_address: string;
  };
  setLoading: (val: boolean) => void;
  setSingleShippingDetails: (data: ShippingAddress) => void;
  setDefault: (val: ShippingAddress) => void;
  setSelectedDeliveryLocation: (location: {
    street: string;
    town: string;
    state: string;
    country: string;
    full_address: string;
  }) => void;
  getShippingById: (id: string) => Promise<void>;
  fetchShippings: () => Promise<void>;
  deleteShippingProfile: (id: string) => Promise<void>;
  fetchShippingOptions: (
    val: ShippingOptions,
    guestId?: string
  ) => Promise<void>;
  fetchGuestShippings: (guestId: string) => Promise<void>;
  clearProductState: () => void;
  guestId?: string;
  setGuestId: (val: string) => void;
  ensureGuestId: () => string;
}

// Which profile is "selected" after a fetch. Preserve an active selection (e.g.
// a just-confirmed/quoted address) if it still exists, else the default profile,
// else the first — never blindly [0], which silently shipped orders to the wrong
// saved address (P2 address reconciliation).
const pickActiveProfile = (
  profiles: ShippingAddress[],
  current?: ShippingAddress
): ShippingAddress | undefined => {
  if (!profiles || profiles.length === 0) return undefined;
  const preserved = current?.id
    ? profiles.find((p) => p.id === current.id)
    : undefined;
  return preserved ?? profiles.find((p) => p.is_default) ?? profiles[0];
};

const useShippingStore = create<ShippingState>()(
  persist(
    (set): ShippingState => ({
      isLoading: false,
      error: null,
      guestId: "",
      shippingDetails: [],
      selectedDeliveryLocation: undefined,
      singleShippingDetails: {
        country: "",
        created_at: "",
        id: "",
        is_default: false,
        latitude: 0,
        longitude: 0,
        shipbubble_address_code: 0,
        shipping_user: {
          created_at: "",
          firstname: "",
          id: "",
          lastname: "",
          phone: "",
          shipping_address_id: "",
          updated_at: "",
          email: "",
        },
        state: "",
        street: "",
        town: "",
        updated_at: "",
        user_id: "",
      },
      shippingOptions: [],
      setGuestId: (id: string) => {
        set({ guestId: id });
      },
      ensureGuestId: () => {
        const currentState = useShippingStore.getState();
        if (!currentState.guestId) {
          const newGuestId = generateRandomHexId(16);
          useShippingStore.getState().setGuestId(newGuestId);
          return newGuestId;
        }
        return currentState.guestId;
      },
      setLoading: (val: boolean) => {
        set({ isLoading: val });
      },
      setDefault: (val: ShippingAddress) => {
        set({ singleShippingDetails: val });
      },
      setSelectedDeliveryLocation: (location: {
        street: string;
        town: string;
        state: string;
        country: string;
        full_address: string;
      }) => {
        set({ selectedDeliveryLocation: location });
      },

      // Set single shipping details
      setSingleShippingDetails: (data: ShippingAddress) => {
        set({ singleShippingDetails: data });
      },

      // Fetch all shippings
      deleteShippingProfile: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          await Client({
            method: "DELETE",
            path: `/shipping/delete-shipping-profile/${id}`,
          });
          set((state) => ({
            shippingDetails: state.shippingDetails.filter((s) => s.id !== id),
            isLoading: false,
          }));
        } catch (error) {
          set({ isLoading: false, error: "Failed to delete shipping profile" });
          throw error; // let the caller surface the toast
        }
      },
      fetchShippings: async () => {
        set({ isLoading: true, error: null });
        try {
          const response: any = (await Client({
            method: "GET",
            path: "/shipping/get-user-shipping-profiles",
          })) as AxiosResponse;
          //("response shipping ", response.data.data.data);
          const profiles: ShippingAddress[] = response.data.data.data ?? [];
          set((state) => ({
            shippingDetails: profiles,
            singleShippingDetails:
              pickActiveProfile(profiles, state.singleShippingDetails) ??
              state.singleShippingDetails,
            isLoading: false,
          }));
        } catch (error: any) {
          console.error("Fetch shipping profiles error:", error);
          
          let errorMessage = "Failed to load shipping profiles";
          if (error?.response?.status === 401) {
            errorMessage = "Session expired. Please log in again";
            toast.error(errorMessage);
          } else {
            toast.error(errorMessage);
          }
          
          set({ error: errorMessage });
        } finally {
          set({ isLoading: false });
        }
      },

      fetchGuestShippings: async (guestId: string) => {
        set({ isLoading: true, error: null });
        try {
          const response: any = (await Client({
            method: "GET",
            path: "/shipping/get-user-shipping-profiles",
            headers: { "guest-id": guestId },
          })) as AxiosResponse;
          //("response shipping ", response.data.data.data);
          const profiles: ShippingAddress[] = response.data.data.data ?? [];
          set((state) => ({
            shippingDetails: profiles,
            singleShippingDetails:
              pickActiveProfile(profiles, state.singleShippingDetails) ??
              state.singleShippingDetails,
            isLoading: false,
          }));
        } catch (error: any) {
          console.error("Fetch guest shipping profiles error:", error);
          
          let errorMessage = "Failed to load shipping profiles";
          if (error?.response?.status === 401) {
            errorMessage = "Guest session expired. Please refresh the page";
          }
          
          toast.error(errorMessage);
          set({ error: errorMessage });
        } finally {
          set({ isLoading: false });
        }
      },

      fetchShippingOptions: async (val: ShippingOptions, guestId?: string) => {
        set({ isLoading: true, error: null });
        
        // First, try with the provided guestId or as authenticated user
        const signIn = {
          method: "POST",
          path: "/shipping/get-shipping-options",
          data: val,
        };
        const guest = {
          method: "POST",
          path: "/shipping/get-shipping-options",
          data: val,
          headers: { "guest-id": guestId },
        };
        const option: any = guestId ? guest : signIn;
        
        try {
          const response: any = (await Client(option)) as AxiosResponse;
          set({
            shippingOptions: response.data.data,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          console.error("Shipping options error:", error);
          
          // If authentication failed (401) and we haven't tried guest mode yet, try with guest ID
          if (error?.response?.status === 401 && !guestId) {
            try {
              const ensuredGuestId = useShippingStore.getState().ensureGuestId();
              const guestOption = {
                method: "POST" as const,
                path: "/shipping/get-shipping-options",
                data: val,
                headers: { "guest-id": ensuredGuestId },
              };
              
              const guestResponse: any = (await Client(guestOption)) as AxiosResponse;
              set({
                shippingOptions: guestResponse.data.data,
                isLoading: false,
                error: null,
              });
              return; // Exit successfully
            } catch (guestError: any) {
              console.error("❌ Guest shipping options also failed:", guestError);
              // Fall through to handle guest error below
              error = guestError;
            }
          }
          
          // Handle different error types with user-friendly messages
          let errorMessage = "Failed to load shipping options";

          if (error?.response?.status === 401) {
            errorMessage = "Unable to load shipping options. Please try refreshing the page";
          } else if (error?.response?.status === 400) {
            // Check if it's actually a CORS error masquerading as 400 or a mobile-specific issue
            if (error?.message?.includes("Network Error") || !error?.response?.data) {
              console.error("🔴 Mobile CORS/Network error detected:", error);
              errorMessage = "Connection issue. Please check your internet and try again";
            } else {
              errorMessage = "Invalid shipping request. Please check your delivery details";
            }
          } else if (error?.response?.status === 500) {
            errorMessage = "Server error. Please try again later";
          } else if (error?.message?.includes("Network Error")) {
            console.error("🔴 Network error - possible CORS issue on mobile:", error);
            errorMessage = "Network error. Please check your connection";
          } else if (error?.response?.data?.error) {
            errorMessage = error.response.data.error;
          }
          
          toast.error(errorMessage);
          set({ 
            error: errorMessage,
            shippingOptions: [],
          });
        } finally {
          set({ isLoading: false });
        }
      },

      getShippingById: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/products?business_id=${id}`,
            method: "GET",
          })) as AxiosResponse;

          set({
            shippingDetails: response.data.data,
            isLoading: false,
          });
        } catch (error: any) {
          console.error("Get shipping by ID error:", error);
          
          let errorMessage = "Failed to load shipping details";
          if (error?.response?.status === 401) {
            errorMessage = "Session expired. Please log in again";
          } else if (error?.response?.status === 404) {
            errorMessage = "Shipping details not found";
          }
          
          toast.error(errorMessage);
          set({ error: errorMessage });
        } finally {
          set({ isLoading: false });
        }
      },
      clearProductState: () => {
        set({
          isLoading: false,
          error: null,
          shippingDetails: [],
          shippingOptions: [],
          singleShippingDetails: {
            country: "",
            created_at: "",
            id: "",
            is_default: false,
            latitude: 0,
            longitude: 0,
            shipbubble_address_code: 0,
            shipping_user: {
              created_at: "",
              firstname: "",
              id: "",
              lastname: "",
              phone: "",
              shipping_address_id: "",
              updated_at: "",
              email: "",
            },
            state: "",
            street: "",
            town: "",
            updated_at: "",
            user_id: "",
          },
          guestId: "",
        });
      },
    }),
    {
      name: "shipping",
      storage: createJSONStorage(() => localStorage),
      // Don't persist transient state: request flags (a redirect can leave
      // isLoading:true → stuck loader) and shippingOptions (per-address quotes
      // that go stale — persisting them showed old quotes AND blocked the
      // auto-refetch, which only fires when the list is empty). Addresses +
      // guestId still persist.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      partialize: ({ isLoading, error, shippingOptions, ...rest }) => rest,
      // Reset transient state on rehydrate to clear anything already persisted
      // before the partialize above (stuck isLoading / stale shippingOptions).
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as any),
        isLoading: false,
        error: null,
        shippingOptions: [],
      }),
    }
  )
);

export default useShippingStore;
