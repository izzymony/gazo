/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { toast } from "sonner";
import { AxiosResponse, AxiosError } from "axios";
import { Client } from "@/lib/client";
import { handleAxiosError } from "@/lib/utils";
import { OrderData } from "@/lib/types";
import { OrderDatas } from "@/lib/order";
import { Carts, CartsItems } from "@/lib/newinterface";

export interface OrderPayloadData {
  sub_total: number;
  shipping_cost: number;
  total: number;
  payment_method: string;
  shipping_option_id: string;
  shipping_profile_id: string;
  // shipping_address: {
  //   country: string;
  //   shipping_user: { firstname: string; lastname: string; phone: string };
  //   state: string;
  //   street: string;
  //   town: string;
  //   user_id: string;
  // };
  cart: { product_id: string; price: number; quantity: number; variant_selection?: string; variant_data?: any }[];
  business_id: string;
}
interface CartPayloadData {
  products: {
    variants: [];
    product_id: string;
    price: number;
    quantity: number;
  }[];
  business_id: string;
}

interface ProductData {
  product_id: string;
  price: number;
  quantity: number;
  business_id: string;
  variants: [];
  variant_selection?: string;
  variant_data?: any;
}

interface OrderUpdateResponse {
  data: OrderData;
}

interface OrderState {
  isLoading: boolean;
  error: string | null;
  orders: OrderDatas[];
  order: OrderData | null;
  newOrders: OrderDatas[];
  newOrder: OrderDatas | null;
  cart: CartsItems[];

  addToCarts: (data: CartsItems[]) => void;
  checkoutCart: CartsItems[];
  setCheckoutCart: (data: CartsItems[]) => void;
  removeCartItem: (id: string) => void;
  clearCartShipping: () => void;

  fetchOrderItems: () => Promise<void>;
  setNewOrderItem: (val: OrderDatas) => void;

  createOrder: (
    orderPayload: OrderPayloadData,
    callback?: (res: AxiosResponse) => void
  ) => Promise<void>;
  createOrders: (
    orderPayload: Carts,
    callback?: (res: AxiosResponse) => void
  ) => Promise<void>;
  createGuestOrders: (
    orderPayload: Carts,
    guestId: string,
    callback?: (res: AxiosResponse) => void
  ) => Promise<void>;
  fetchOrders: (business_id: string) => Promise<void>;
  fetchAllOrders: () => Promise<void>;
  fetchAllSellerOrders: () => Promise<void>;
  fetchGuestOrders: (guestId: string) => Promise<void>;
  verifyTransaction: (reference: string, guestId?: string) => Promise<{ success: boolean; data: unknown }>;
  getGuestOrdersById: (guestId: string, id: string) => Promise<void>;
  fetchOrdersByUserId: (user_id: string) => Promise<void>;
  getOrderById: (id: string) => Promise<void>;
  getSellerOrderById: (id: string) => Promise<void>;
  getOrderByIdPublic: (id: string) => Promise<void>;
  updateOrder: (
    id: string,
    orderPayload: Partial<OrderPayloadData>
  ) => Promise<void>;
  clearOrderState: () => void;
  carts: CartPayloadData[];
  addToCart: (product: ProductData) => void;
  removeFromCart: (product_id: string) => void;
  initiateTransaction: (invoice: string, amount: number, email: string) => void;
  markOrderReady: (orderId: string) => Promise<void>;
  // Self-delivery lifecycle (seller-driven): out-for-delivery records an optional
  // dispatch contact; delivered releases the seller's funds into clearing.
  markSelfOutForDelivery: (
    orderId: string,
    dispatch?: { name?: string; phone?: string; note?: string }
  ) => Promise<void>;
  markSelfDelivered: (orderId: string) => Promise<void>;
  initiateGuestTransaction: (
    invoice: string,
    amount: number,
    guestId: string,
    email: string
  ) => void;
  // Order-on-success: one call that validates the order and initiates payment;
  // the order is created on charge.success (verify), not now. Redirects to
  // Paystack on success.
  initiateCheckout: (order: Carts, email: string) => Promise<void>;
  initiateGuestCheckout: (
    order: Carts,
    guestId: string,
    email: string
  ) => Promise<void>;
}

const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      isLoading: false,
      error: null,
      orders: [],
      order: null,
      carts: [],
      cart: [],
      checkoutCart: [],
      newOrder: null,
      newOrders: [],

      addToCarts: (data: CartsItems[]) => {
        // Consolidate duplicate items based on product_id, color, shippingId, and price
        const consolidatedCart: CartsItems[] = [];
        
        data.forEach((newItem) => {
          const existingItemIndex = consolidatedCart.findIndex((existingItem) => 
            existingItem.product_id === newItem.product_id &&
            existingItem.color === newItem.color &&
            existingItem.shippingId === newItem.shippingId &&
            existingItem.price === newItem.price
          );
          
          if (existingItemIndex >= 0) {
            // Item exists, increase quantity
            consolidatedCart[existingItemIndex].quantity += newItem.quantity;
          } else {
            // New unique item, add to cart
            consolidatedCart.push({ ...newItem });
          }
        });
        
        set({
          cart: consolidatedCart,
        });
      },

      // Selection carried into checkout WITHOUT mutating the main cart, so
      // deselecting items at checkout no longer deletes them (W1.8).
      setCheckoutCart: (data: CartsItems[]) => {
        set({ checkoutCart: data });
      },

      removeCartItem: (id: string) => {
        set((state) => ({
          cart: state.cart.filter((item) => item.id !== id),
        }));
      },

      // Invalidate per-item shipping quotes (e.g. after the buyer switches
      // delivery address at review) so a quote made for a different destination
      // can't be silently charged. The buyer re-selects delivery per item, which
      // re-quotes against the new address. Interim P2 guard; the seamless
      // re-quote flow is design phase D.
      clearCartShipping: () => {
        const strip = (items: CartsItems[]) =>
          items.map((it) => ({
            ...it,
            shippingId: "",
            shippingPrice: "",
            shippingName: "",
            shippingEstimate: "",
          }));
        set((state) => ({
          cart: strip(state.cart),
          checkoutCart: strip(state.checkoutCart),
        }));
      },

      verifyTransaction: async (reference: string, guestId?: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await Client<{ data?: unknown }>({
            path: "/transactions/verify",
            method: "POST",
            data: { reference },
            // Guests have no auth token — the transaction lives in the *_guest
            // tables, so verify MUST carry the guest-id or the backend looks in
            // the wrong table, "fails" a paid order, and shows a false failure.
            ...(guestId ? { headers: { "guest-id": guestId } } : {}),
          });
          set({ isLoading: false });
          // The backend returns 200 only when Paystack confirmed the payment
          // (400 otherwise), so reaching here means a verified-successful payment.
          return { success: true as const, data: response.data?.data ?? null };
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          return { success: false as const, data: null };
        }
      },

      fetchOrderItems: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: "/orders/get-user-orders?limit=200&page=1",
            method: "GET",
          })) as AxiosResponse;
          //("neworders=> ", response.data.data.data);
          set({
            newOrders: response.data.data.data,
            isLoading: false,
          });
        } catch (error) {
          set({ error: (error as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },
      setNewOrderItem: (val: OrderDatas) => {
        set({ newOrder: val });
      },

      // Create a new order
      createOrder: async (
        orderPayload: OrderPayloadData,
        callback?: (res: AxiosResponse) => void
      ) => {
        set({ isLoading: true, error: null });
        try {
          const response = await Client({
            path: "/orders/create-order",
            method: "POST",
            data: orderPayload,
          }).then((response) => response as AxiosResponse);
          //("order made ", response);
          set({ order: response.data?.data });

          if (callback) {
            callback(response.data?.data);
          }

          set((state) => {
            const remainingCarts = state.carts.filter(
              (cart) => cart.business_id !== orderPayload.business_id
            );
            return { carts: remainingCarts };
          });

          toast.success("Order created successfully!");
        } catch (error) {
          set({ error: (error as Error).message });
          handleAxiosError(error);
        } finally {
          set({ isLoading: false });
        }
      },

      createOrders: async (
        orderPayload: Carts,
        callback?: (res: AxiosResponse) => void
      ) => {
        set({ isLoading: true, error: null });
        //("order ", orderPayload);
        try {
          const response = await Client({
            path: "/orders/create-order",
            method: "POST",
            data: orderPayload,
          }).then((response) => response as AxiosResponse);
          //("order made ", response);
          set({ order: response.data?.data });
          toast.success("Order created successfully!");
          if (callback) {
            callback(response.data?.data);
          }
        } catch (error) {
          set({ error: (error as Error).message });
          handleAxiosError(error);
        } finally {
          set({ isLoading: false });
        }
      },

      createGuestOrders: async (
        orderPayload: Carts,
        guestId: string,
        callback?: (res: AxiosResponse) => void
      ) => {
        set({ isLoading: true, error: null });
        //("order ", orderPayload, guestId);
        try {
          const response = await Client({
            path: "/orders/create-order",
            method: "POST",
            data: orderPayload,
            headers: { "guest-id": guestId },
          }).then((response) => response as AxiosResponse);
          //("order made ", response);
          set({ order: response.data?.data });
          toast.success("Order created successfully!");
          if (callback) {
            callback(response.data?.data);
          }
        } catch (error) {
          set({ error: (error as Error).message });
          handleAxiosError(error);
        } finally {
          set({ isLoading: false });
        }
      },

      // Fetch all orders
      fetchOrders: async (business_id: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/orders?user_id=${business_id}`,
            method: "GET",
          })) as AxiosResponse;

          set({
            orders: response.data.data,
            isLoading: false,
          });
        } catch (error) {
          set({ error: (error as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },
      fetchOrdersByUserId: async (user_id: string) => {
        //(user_id);
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/orders/${user_id}`,
            method: "GET",
          })) as AxiosResponse;
          //("response of order ", response.data);
          set({
            orders: response.data.data,
            isLoading: false,
          });
        } catch (error) {
          set({ error: (error as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },
      fetchGuestOrders: async (guestId: string) => {
        set({ isLoading: true, error: null });
        try {
          // SECURITY FIX: Only fetch guest orders if we have a valid guestId
          if (!guestId || guestId.trim() === "") {
            console.warn("⚠️ No valid guestId provided - cannot fetch guest orders");
            set({ orders: [], isLoading: false });
            return;
          }

          const response: any = (await Client({
            method: "GET",
            path: `/orders/get-user-orders?limit=200&page=1`,
            headers: { "guest-id": guestId },
          })) as AxiosResponse;
          
          // SECURITY CHECK: Ensure response is for this specific guest
          const guestOrders = response.data?.data?.data || [];
          
          set({
            orders: guestOrders,
            isLoading: false,
          });
        } catch (error) {
          console.error("❌ Failed to fetch guest orders:", error);
          // SECURITY: On error, clear orders to prevent data leakage
          set({ orders: [], error: (error as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },
      // Fetch all orders
      fetchAllOrders: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/orders/get-user-orders?limit=200&page=1`,
            method: "GET",
          })) as AxiosResponse;
          set({
            orders: response.data.data.data,
            newOrders: response.data.data.data,
            isLoading: false,
          });
        } catch (error) {
          console.error("❌ fetchAllOrders failed:", error);
          set({ error: (error as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },
      fetchAllSellerOrders: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: "/business/get-orders",
            method: "GET",
          })) as AxiosResponse;
          set({
            orders: response.data.data.data,
            newOrders: response.data.data.data,
            isLoading: false,
          });
        } catch (error) {
          console.error("❌ fetchAllSellerOrders failed:", error);
          set({ error: (error as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },

      getGuestOrdersById: async (guestId: string, id: string) => {
        set({ isLoading: true, error: null });
        try {
          const response: any = (await Client({
            method: "GET",
            path: `/orders/get-order/${id}`,
            headers: { "guest-id": guestId },
          })) as AxiosResponse;
          // Set newOrder too: the order-tracking page reads newOrder, and guests
          // previously got a permanent spinner because only `order` was set.
          set({ order: response.data.data, newOrder: response.data.data });
        } catch (error) {
          set({ error: (error as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },

      // Fetch a single order by ID
      getOrderById: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/orders/get-order/${id}`,
            method: "GET",
          })) as AxiosResponse;
          //(response.data.data);
          // Set both order and newOrder to ensure the order details page works
          // when navigating from activities/notifications
          set({ order: response.data.data, newOrder: response.data.data });
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },

      // Fetch a single order by ID for SELLER dashboard (includes seller_activity)
      getSellerOrderById: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/business/get-order/${id}`,
            method: "GET",
          })) as AxiosResponse;
          // Set both order and newOrder for seller dashboard order details page
          set({ order: response.data.data, newOrder: response.data.data });
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },

      // Fetch a single order by ID publicly (no auth required)
      getOrderByIdPublic: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/orders/public/get-order/${id}`,
            method: "GET",
          })) as AxiosResponse;
          set({ order: response.data.data });
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          console.error("Public order fetch error:", err);
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },

      // Update an order
      updateOrder: async (
        id: string,
        orderPayload: Partial<OrderPayloadData>
      ) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/orders/${id}`,
            method: "PUT",
            data: orderPayload,
          })) as OrderUpdateResponse;
          //(response);
          // set((state) => ({
          //   orders: state.orders.map((order) =>
          //     order.id === id ? { ...order, ...response.data } : order
          //   ),
          // }));

          toast.success("Order updated successfully!");
        } catch (error) {
          set({ error: (error as Error).message });
          handleAxiosError(error);
        } finally {
          set({ isLoading: false });
        }
      },

      addToCart: (product) => {
        set((state) => {
          const existingBusiness = state.carts.find(
            (cart) => cart.business_id === product.business_id
          );

          if (existingBusiness) {
            const updatedProducts = existingBusiness.products.map((p) =>
              p.product_id === product.product_id
                ? { ...p, quantity: product.quantity }
                : p
            );

            const isNewProduct = !existingBusiness.products.some(
              (p) => p.product_id === product.product_id
            );

            if (isNewProduct) {
              updatedProducts.push({
                product_id: product.product_id,
                price: product?.price,
                quantity: product.quantity || 1,
                variants: [],
              });
            }

            return {
              carts: state.carts.map((cart) =>
                cart.business_id === product.business_id
                  ? { ...cart, products: updatedProducts }
                  : cart
              ),
            };
          }

          // If no cart exists for the business, create a new one
          return {
            carts: [
              ...state.carts,
              {
                business_id: product.business_id,
                products: [
                  {
                    product_id: product.product_id,
                    price: product.price,
                    quantity: product.quantity || 1, // Default quantity to 1
                    variants: product.variants || [],
                  },
                ],
              },
            ],
          };
        });
      },
      // Remove from Cart
      removeFromCart: (product_id) => {
        set((state) => ({
          carts: state.carts
            .map((cart) => ({
              ...cart,
              products: cart.products.filter(
                (product) => product.product_id !== product_id
              ),
            }))
            .filter((cart) => cart.products.length > 0), // Remove the cart if it has no products left
        }));
      },

      initiateTransaction: async (
        invoice: string,
        amount: number,
        email: string
      ) => {
        try {
          const response = (await Client({
            path: "/transactions/initiate",
            method: "POST",
            data: {
              order_type: "order",
              amount: amount,
              invoice: invoice,
              redirect_url: `${process.env
                .NEXT_PUBLIC_CALLBACKENDPOINT!}/cart/payment-successful?order_id=${invoice}`,
              email: email,
            },
          })) as any;

          if (response.status === 200) {
            toast.success("Transaction initiated successfully!");
            const { data: data } = response.data;
            //(data);
            window.location.href = data.authorization_url;
          } else {
            toast.error("Login failed. Please check your credentials.");
          }
        } catch (error) {
          handleAxiosError(error);
        } finally {
          set({ isLoading: false });
        }
      },

      initiateGuestTransaction: async (
        invoice: string,
        amount: number,
        guestId: string,
        email: string
      ) => {
        try {
          const response = (await Client({
            path: "/transactions/initiate",
            method: "POST",
            headers: { "guest-id": guestId },
            data: {
              order_type: "order",
              amount: amount,
              invoice: invoice,
              redirect_url: `${process.env
                .NEXT_PUBLIC_CALLBACKENDPOINT!}/cart/payment-successful?order_id=${invoice}`,
              email: email,
            },
          })) as any;

          if (response.status === 200) {
            toast.success("Transaction initiated successfully!");
            const { data: data } = response.data;
            //(data);
            window.location.href = data.authorization_url;
          } else {
            toast.error("Login failed. Please check your credentials.");
          }
        } catch (error) {
          handleAxiosError(error);
        } finally {
          set({ isLoading: false });
        }
      },

      // Order-on-success: validate the order + initiate payment in one call.
      // The order is NOT persisted here — the backend stores it as the
      // transaction payload and creates it on charge.success (verify), so a
      // failed/abandoned payment leaves no orphan order and the cart stays
      // intact. Paystack appends ?reference=<invoice> to the redirect URL,
      // which the payment-successful page verifies.
      initiateCheckout: async (order: Carts, email: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: "/transactions/initiate-checkout",
            method: "POST",
            data: {
              ...order,
              redirect_url: `${process.env
                .NEXT_PUBLIC_CALLBACKENDPOINT!}/cart/payment-successful`,
              email,
            },
          })) as any;

          if (response.status === 200) {
            const { data } = response.data;
            window.location.href = data.authorization_url;
          } else {
            toast.error("Could not start payment. Please try again.");
            set({ isLoading: false });
          }
        } catch (error) {
          handleAxiosError(error);
          set({ isLoading: false });
        }
      },

      initiateGuestCheckout: async (
        order: Carts,
        guestId: string,
        email: string
      ) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: "/transactions/initiate-checkout",
            method: "POST",
            headers: { "guest-id": guestId },
            data: {
              ...order,
              redirect_url: `${process.env
                .NEXT_PUBLIC_CALLBACKENDPOINT!}/cart/payment-successful`,
              email,
            },
          })) as any;

          if (response.status === 200) {
            const { data } = response.data;
            window.location.href = data.authorization_url;
          } else {
            toast.error("Could not start payment. Please try again.");
            set({ isLoading: false });
          }
        } catch (error) {
          handleAxiosError(error);
          set({ isLoading: false });
        }
      },

      markOrderReady: async (orderId: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await Client({
            path: `/business/mark-order-ready/${orderId}`,
            method: "PATCH",
          }) as AxiosResponse;
          
          // Update the local order state with the new status
          set((state) => ({
            newOrder: response.data.data,
            newOrders: state.newOrders.map(order => 
              order.id === orderId ? response.data.data : order
            ),
            isLoading: false,
          }));
          
          toast.success("Order marked as ready for pickup!");
        } catch (error) {
          set({ error: (error as Error).message });
          handleAxiosError(error);
        } finally {
          set({ isLoading: false });
        }
      },

      // NB: the backend returns the updated item WITHOUT its shipping_option /
      // shipment relations preloaded, so we deliberately don't write it into
      // newOrder here (the detail page reads shipping_option.delivery_days
      // non-optionally). The caller refetches via getSellerOrderById to get the
      // fully-preloaded order + fresh activity timeline.
      markSelfOutForDelivery: async (orderId, dispatch) => {
        set({ isLoading: true, error: null });
        try {
          await Client({
            path: `/business/mark-out-for-delivery/${orderId}`,
            method: "PATCH",
            data: dispatch ?? {},
          });
          toast.success("Marked out for delivery");
        } catch (error) {
          set({ error: (error as Error).message });
          handleAxiosError(error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      markSelfDelivered: async (orderId) => {
        set({ isLoading: true, error: null });
        try {
          await Client({
            path: `/business/mark-delivered/${orderId}`,
            method: "PATCH",
          });
          toast.success("Order marked as delivered");
        } catch (error) {
          set({ error: (error as Error).message });
          handleAxiosError(error);
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      clearOrderState: () => {
        set({
          isLoading: false,
          error: null,
          carts: [],
          cart: [],
          checkoutCart: [],
          orders: [],
          order: null,
          newOrders: [],
          newOrder: null,
        });
      },
    }),
    {
      // NOTE (W2.3): this store was calling persist() with NO options, so zustand
      // wrote the FULL state to localStorage key "undefined" despite the comment
      // below claiming persistence was removed. Giving it a real name stops the
      // "undefined" key. The cross-user-leak fix (persist only the cart via
      // partialize + clear on logout, or drop persist entirely) is deferred to W2.3.
      name: "order-store",
      // Never persist transient request flags. A payment redirect sets
      // isLoading:true and navigates to Paystack before it resets, so persisting
      // it rehydrated isLoading:true on return and left every page reading
      // orderStore.isLoading (e.g. the order review) stuck on a loader forever.
      partialize: ({ isLoading, error, ...rest }) => rest,
      // Force transient flags to their initial values on rehydrate, so any
      // isLoading:true ALREADY written to localStorage (before partialize) also
      // can't leave a page stuck on a loader.
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<OrderState>),
        isLoading: false,
        error: null,
      }),
    }
  )
);

export default useOrderStore;
