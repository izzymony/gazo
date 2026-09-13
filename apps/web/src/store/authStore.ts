/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { toast } from "sonner";
import { SignupData, User, OTPData } from "@/lib/types";
import { Client } from "@/lib/client";
import Cookies from "js-cookie";
import { AxiosError, AxiosResponse } from "axios";
import { handleAxiosError } from "@/lib/utils";

interface AuthState {
  isLoading: boolean;
  isLoginLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  user: User | null;
  users: User[];
  token: string | null;
  otpData: OTPData | null;
  authtypes: "google" | "instagram" | "tiktok" | "";
  setAuthTypes: (val: "google" | "instagram" | "tiktok" | "") => void;
  followBusiness: (
    val: string,
    callback?: (val: string) => void
  ) => Promise<void>;
  unfollowBusiness: (
    val: string,
    callback?: (val: string) => void
  ) => Promise<void>;
  signup: (
    signupPayload: SignupData,
    callback?: (data: unknown) => void
  ) => Promise<void>;
  login: (
    loginPayload: { identifier: string; password: string; auth_type: string },
    callback: (data?: { business?: { id?: string } }) => void
  ) => Promise<void>;
  loginSocial: (
    type: "instagram" | "google" | "tiktok",
    callback: (data?: any) => void
  ) => Promise<void>;
  socialCallback: (
    code: string,
    type: "instagram" | "google" | "tiktok",
    callback: (data?: any) => void
  ) => Promise<void>;
  getMe: () => Promise<{ user: User | null; business: any } | void>;
  fetchAndFixBusinessId: () => Promise<string | null>;
  fetchAndSetCurrentUserBusiness: () => Promise<void>;
  changePassword: (
    userId?: string | undefined,
    passwordPayload?: { old_password: string; new_password: string },
    callback?: () => void
  ) => void;
  sendOtp: (
    payload: { identifier?: string; request_type?: string },
    callback: () => void
  ) => Promise<void>;
  forgotPassword: (
    payload: { indentifier?: string; new_password?: string; code: string },
    callback: () => void
  ) => Promise<void>;
  setOtpData: (data: OTPData) => void;
  clearUserState: () => void;
  getUsers: () => void;
  logout: (router: () => void) => void;
  updateUser: (userInfo?: User | FormData, callback?: () => void) => Promise<void>;
  getUserById: (id?: string) => void;
  createShippingAddress: (
    addressPayload: {
      country: string;
      shipping_user: {
        firstname: string;
        lastname: string;
        phone?: string;
        email: string;
      };
      state: string;
      street: string;
      town: string;
      user_id: string;
      is_default: boolean;
    },
    callback?: (created?: any) => void
  ) => void;
  createGuestShippingAddress: (
    addressPayload: {
      country: string;
      shipping_user: {
        firstname: string;
        lastname: string;
        phone?: string;
        email: string;
      };
      state: string;
      street: string;
      town: string;
      user_id: string;
      is_default: boolean;
    },
    id: string,
    callback: (created?: any) => void
  ) => void;
  updateShippingAddress: (
    addressId: string,
    addressPayload: {
      country?: string;
      shipping_user?: { firstname?: string; lastname?: string; phone?: string };
      state?: string;
      street?: string;
      town?: string;
      user_id?: string;
    }
  ) => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set): AuthState => ({
      isLoading: false,
      isLoginLoading: false,
      error: null,
      isAuthenticated: false,
      user: null,
      otpData: null,
      token: null,
      users: [] as User[],
      authtypes: "" as const,

      setAuthTypes: (val) => {
        return set({ authtypes: val });
      },

      followBusiness: async (val: string, callback?: (val: string) => void) => {
        set({ error: null });
        try {
          const response = (await Client({
            path: `/users/follow-business/${val}`,
            method: "PATCH",
          })) as AxiosResponse<{ data: { message: string; data: any } }>;

          //(response);
          if (callback) {
            callback(val);
          }
        } catch (error) {
          handleAxiosError(error);
        } finally {
          set({ isLoading: false });
        }
      },

      unfollowBusiness: async (
        val: string,
        callback?: (val: string) => void
      ) => {
        set({ error: null });
        try {
          const response = (await Client({
            path: `/users/unfollow-business/${val}`,
            method: "PATCH",
          })) as AxiosResponse<{ data: { message: string; data: any } }>;
          //(response);
          if (callback) {
            callback(val);
          }
        } catch (error) {
          handleAxiosError(error);
        } finally {
          set({ isLoading: false });
        }
      },

      signup: async (
        signupPayload: SignupData,
        callback?: (data: unknown) => void
      ) => {
        console.log(signupPayload);
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: "/register",
            method: "POST",
            data: signupPayload,
          })) as AxiosResponse<{
            data: {
              token: string;
              data: User;
              access_token: string;
              refresh_token: string;
            };
          }>;

          if (response.status === 200) {
            const { token, access_token, data, refresh_token } = response.data.data;
            const authToken = access_token || token; // Handle both response formats
            console.log("👤 User data structure:", {
              fullUserData: data,
              hasId: !!data?.id,
              hasUserId: !!data?.user_id,
              hasID: !!(data as Record<string, unknown>)?.ID,
              allKeys: Object.keys(data || {}),
              firstFiveValues: Object.entries(data || {}).slice(0, 5).map(([k, v]) => `${k}: ${v}`)
            });
            
            // Set cookies with explicit options for immediate server availability
            console.log("🍪 Setting cookies...");
            Cookies.set("accessToken", authToken, { 
              expires: 3, 
              sameSite: 'lax', 
              secure: false,
              path: '/'  // Ensure cookie is available on all paths
            });
            Cookies.set("refreshToken", refresh_token, { 
              expires: 7, 
              sameSite: 'lax', 
              secure: false,
              path: '/'
            });
            
            // Also set in document.cookie for immediate server availability
            document.cookie = `accessToken=${authToken}; path=/; max-age=${3 * 24 * 60 * 60}; SameSite=lax`;
            document.cookie = `refreshToken=${refresh_token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=lax`;
            
            // Verify cookies were set immediately
            const verifyAccessToken = Cookies.get("accessToken");
            const verifyRefreshToken = Cookies.get("refreshToken");
            console.log("🔍 Cookie verification immediately after setting:", {
              accessTokenSet: !!verifyAccessToken,
              refreshTokenSet: !!verifyRefreshToken,
              accessTokenMatches: verifyAccessToken === authToken,
              refreshTokenMatches: verifyRefreshToken === refresh_token
            });
            set({ user: data, isAuthenticated: true, token: authToken });

            // W2.7: one deterministic /me call fills user + business (replaces
            // the retry loop + cookie polling). A brand-new account has no store
            // yet, so business comes back null here — that's expected, not an error.
            await useAuthStore.getState().getMe();

            toast.success("Signup successful!");

            if (callback) {
              callback(response.data);
            }
          } else {
            toast.error("Failed to register. Please try again.");
          }
        } catch (error) {
          handleAxiosError(error);
        } finally {
          set({ isLoading: false });
        }
      },

      login: async (
        loginPayload,
        callback?: (data: { business?: { id?: string } }) => void
      ) => {
        set({ isLoginLoading: true, error: null });
        try {
          const response = (await Client({
            path: "/login",
            method: "POST",
            data: loginPayload,
          })) as AxiosResponse<{
            data: {
              token: string;
              data: User;
              access_token: string;
              refresh_token: string;
            };
          }>;

          if (response.status === 200) {
            const {
              data,
              access_token: token,
              refresh_token,
            } = response.data.data;
            Cookies.set("accessToken", token, { expires: 3 });
            Cookies.set("refreshToken", refresh_token, { expires: 7 });
            set({ user: data, isAuthenticated: true, token });

            // W2.7: one deterministic /me call fills user + business (replaces
            // the retry loop + cookie polling). Cookies were set synchronously
            // above, so getMe's request carries the token.
            await useAuthStore.getState().getMe();

            toast.success("Login successful!");

            if (callback) {
              callback(useAuthStore.getState().user ?? data);
            }
          } else {
            toast.error("Login failed. Please check your credentials.");
          }
        } catch (error) {
          handleAxiosError(error);
        } finally {
          set({ isLoginLoading: false });
        }
      },
      loginSocial: async (type, callback?: (data: any) => void) => {
        set({ isLoginLoading: true, error: null });
        try {
          const urlpicker =
            type === "instagram"
              ? `/auth/instagram?redirect_url=${process.env
                  .NEXT_PUBLIC_CALLBACKENDPOINT!}/welcome`
              : type === "tiktok"
              ? `/auth/tiktok?redirect_url=${process.env
                  .NEXT_PUBLIC_CALLBACKENDPOINT!}/welcome`
              : `/auth/google?redirect_url=${process.env
                  .NEXT_PUBLIC_CALLBACKENDPOINT!}/welcome`;
          const response = (await Client({
            path: urlpicker,
            method: "GET",
          })) as any;

          if (response.status === 200) {
            const { data } = response.data;
            window.location.href = data.url;
            if (callback) {
              //("shifting");
              callback(data);
            }
          } else {
            toast.error("Login failed. Please check your credentials.");
          }
        } catch (error) {
          handleAxiosError(error);
        } finally {
          set({ isLoginLoading: false });
        }
      },
      socialCallback: async (
        code: string,
        type,
        callback?: (data: any) => void
      ) => {
        set({ isLoginLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/auth/callback`,
            method: "POST",
            data: {
              code: code,
              redirect_url: `${process.env
                .NEXT_PUBLIC_CALLBACKENDPOINT!}/welcome`,
              provider: type,
            },
          })) as any;

          if (response.status === 200) {
            const { user_data, token, refresh_token } =
              response.data.data.token;
            Cookies.set("accessToken", token, { expires: 3 });
            Cookies.set("refreshToken", refresh_token, { expires: 7 });
            set({ user: user_data, isAuthenticated: true, token });

            // W2.7: one deterministic /me call fills user + business (replaces
            // the retry loop). Cookies were set synchronously above.
            await useAuthStore.getState().getMe();

            toast.success("Login successful!");

            if (callback && user_data) {
              callback(user_data);
            }
          } else {
            toast.error("Login failed. Please check your credentials.");
          }
        } catch (error) {
          handleAxiosError(error);
        } finally {
          set({ isLoginLoading: false });
        }
      },
      getUsers: async () => {
        set({ isLoginLoading: true, error: null });
        try {
          const response = (await Client({
            path: "/users",
            method: "POST",
          })) as AxiosResponse;

          set({ users: response?.data?.data });
        } catch (error) {
          handleAxiosError(error);
        } finally {
          set({ isLoginLoading: false });
        }
      },
      getUserById: async (id?: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: `/users/${id}`,
            method: "GET",
          })) as AxiosResponse;

          set({ user: response.data.data });
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },
      updateUser: async (userInfo?: User | FormData, callback?: () => void) => {
        set({ isLoading: true, error: null });
        try {
          const isFormData = userInfo instanceof FormData;
          const response = (await Client({
            path: `/users/update-user`,
            method: "PUT",
            data: userInfo,
            contentType: isFormData ? "multipart/form-data" : "application/json",
          })) as AxiosResponse;
          
          // Update the user data in the store
          set({ user: response.data.data });

          // SUCCESS ONLY. The callback is the caller's success path — it toasts
          // and navigates away. It used to sit in `finally`, so a FAILED save
          // still announced "Profile updated successfully!" and bounced the user
          // back, while the error toast fired alongside it and nothing saved.
          // The caller owns the success message, so the store no longer raises a
          // second one of its own.
          if (callback) {
            callback();
          }
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
          toast.error(err.response?.data?.error || "Failed to update user");
        } finally {
          set({ isLoading: false });
        }
      },

      changePassword: async (
        userId?: string | undefined,
        passwordPayload?: { old_password: string; new_password: string },
        callback?: () => void
      ) => {
        set({ isLoading: true, error: null });
        try {
          if (!userId) {
            throw new Error("User ID is required");
          }

          await Client({
            path: `/users/change-password`,
            method: "PUT",
            data: passwordPayload,
          });

          toast.success("Password changed successfully");
          // Do NOT overwrite `user` here: change-password returns no user object,
          // and clobbering it corrupts the session (the old code PUT to the wrong
          // endpoint, /users/recommendations, so the password never changed).

          // Success only — same reason as updateUser above: from `finally` this
          // ran the caller's success path even when the change had failed.
          if (callback) {
            callback();
          }
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          toast.error(err.response?.data?.error || "Failed to change password");
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },

      forgotPassword: async (payload, callback?: (data: unknown) => void) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: "/forgot-password",
            method: "POST",
            data: payload,
          })) as AxiosResponse<{ data: { token: string; data: User } }>;

          if (response.status === 200) {
            toast.success("Password reset successful!");
            if (callback) {
              callback(response.data.data);
            }
          } else {
            toast.error("Couldn't reset password. Please check the code and try again.");
          }
        } catch (error) {
          handleAxiosError(error);
        } finally {
          set({ isLoading: false });
        }
      },
      sendOtp: async (payload, callback?: (data: unknown) => void) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: "/send-otp",
            method: "POST",
            data: payload,
          })) as AxiosResponse<{ data: { token: string; data: User } }>;

          toast.success("Otp sent successfully!");
          if (callback) {
            callback(response.data.data);
          }
        } catch (error) {
          handleAxiosError(error);
        } finally {
          set({ isLoading: false });
        }
      },

      setOtpData: (data: OTPData) => {
        set({ otpData: data });
      },
      logout: (router: () => void) => {
        // Reset EVERY store's in-memory state, not just auth, so the next user on
        // a shared device can't see the previous user's business/orders/addresses
        // (W2.2). Dynamic imports sidestep the authStore <-> stores import cycle.
        void (async () => {
          try {
            const [biz, prod, ord, ship] = await Promise.all([
              import("@/store/businessStore"),
              import("@/store/productStore"),
              import("@/store/orderStore"),
              import("@/store/shippingStore"),
            ]);
            biz.default.getState().clearStoreState();
            prod.default.getState().clearProductState();
            ord.default.getState().clearOrderState();
            ship.default.getState().clearProductState();
          } catch (e) {
            console.error("Failed to reset stores on logout:", e);
          }
        })();

        // Clear all persisted state from local storage to prevent stale data
        localStorage.removeItem("user");
        localStorage.clear();

        // Reset all state variables to their initial values
        set({
          isLoading: false,
          isLoginLoading: false,
          error: null,
          isAuthenticated: false,
          user: null,
          otpData: null,
          token: null,
          users: [],
          authtypes: "",
        });

        // Remove authentication cookies
        Cookies.remove("accessToken");
        Cookies.remove("refreshToken");
        
        toast.success("Logout successful!");
        router();
      },

      createShippingAddress: async (
        addressPayload: {
          country: string;
          shipping_user: {
            firstname: string;
            lastname: string;
            phone?: string;
            email: string;
          };
          state: string;
          street: string;
          town: string;
          user_id?: string;
          is_default: boolean;
        },
        callback?: (created?: any) => void
      ) => {
        set({ isLoading: true, error: null });
        // //({
        //   country: addressPayload.country,
        //   shipping_user: {
        //     firstname: addressPayload.shipping_user.firstname,
        //     lastname: addressPayload.shipping_user.lastname,
        //     phone: addressPayload.shipping_user.phone,
        //     email: addressPayload.shipping_user.email,
        //   },
        //   state: addressPayload.state,
        //   street: addressPayload.street,
        //   town: addressPayload.town,
        //   is_default: addressPayload.is_default,
        // });
        try {
          const response = (await Client({
            path: "/shipping/add-shipping-profile",
            method: "POST",
            data: {
              country: addressPayload.country,
              shipping_user: {
                firstname: addressPayload.shipping_user.firstname,
                lastname: addressPayload.shipping_user.lastname,
                phone: addressPayload.shipping_user.phone,
                email: addressPayload.shipping_user.email,
              },
              state: addressPayload.state,
              street: addressPayload.street,
              town: addressPayload.town,
              is_default: addressPayload.is_default,
            },
          })) as AxiosResponse<{ data: any }>;

          toast.success("Shipping address created successfully!");
          if (callback) {
            // Pass the created profile so checkout can select it (address
            // reconciliation) instead of falling back to shippingDetails[0].
            callback(response.data?.data);
          }
          return response.data;
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          toast.error(
            err.response?.data?.error || "Failed to create shipping address"
          );
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },

      createGuestShippingAddress: async (
        addressPayload: {
          country: string;
          shipping_user: {
            firstname: string;
            lastname: string;
            phone?: string;
            email: string;
          };
          state: string;
          street: string;
          town: string;
          user_id?: string;
          is_default: boolean;
        },
        id: string,
        callback?: (created?: any) => void
      ) => {
        set({ isLoading: true, error: null });
        try {
          const response = (await Client({
            path: "/shipping/add-shipping-profile",
            method: "POST",
            data: {
              country: addressPayload.country,
              shipping_user: {
                firstname: addressPayload.shipping_user.firstname,
                lastname: addressPayload.shipping_user.lastname,
                phone: addressPayload.shipping_user.phone,
                email: addressPayload.shipping_user.email,
              },
              state: addressPayload.state,
              street: addressPayload.street,
              town: addressPayload.town,
              is_default: addressPayload.is_default,
            },
            headers: { "guest-id": id },
          })) as AxiosResponse<{ data: any }>;

          toast.success("Shipping address created successfully!");
          if (callback) {
            // Pass the created profile so checkout can select it (address
            // reconciliation) instead of falling back to shippingDetails[0].
            callback(response.data?.data);
          }
          return response.data;
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          toast.error(
            err.response?.data?.error || "Failed to create shipping address"
          );
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },

      updateShippingAddress: async (
        addressId: string,
        addressPayload: {
          country?: string;
          shipping_user?: {
            firstname?: string;
            lastname?: string;
            phone?: string;
          };
          state?: string;
          street?: string;
          town?: string;
          user_id?: string;
        },
        callback?: () => void
      ) => {
        set({ isLoading: true, error: null });
        try {
          if (!addressId) {
            throw new Error("Address ID is required");
          }

          const response = (await Client({
            path: `/shipping-address/${addressId}`,
            method: "PUT",
            data: addressPayload,
          })) as AxiosResponse<{ data: { message: string } }>;

          // No toast here: the only caller (profile/shipping-address/edit)
          // announces both outcomes itself, so toasting here showed the user
          // TWO success messages for one save.
          if (callback) {
            callback();
          }
          return response.data;
        } catch (error) {
          const err = error as AxiosError<{ error: string }>;
          set({ error: err.message });
          // Re-throw so the caller's catch actually runs. Swallowing here let
          // `await updateShippingAddress(...)` resolve on failure, so the page
          // toasted success and router.replace'd away from an unsaved edit.
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // W2.7: single deterministic auth bootstrap. GET /users/me returns the
      // user AND their business in one call, so we no longer poll /business with
      // retry loops. Sets authStore.user (with business) + isAuthenticated, and
      // mirrors the store/theme into businessStore so the storefront renders on
      // refresh. A user with no store gets business: null (not an error).
      getMe: async () => {
        try {
          const response = (await Client({
            path: "/users/me",
            method: "GET",
          })) as AxiosResponse<{ data: { user: User; business: any } }>;

          const payload = response.data?.data;
          const user = payload?.user ?? null;
          const business = payload?.business ?? null;

          if (!user) return;

          set({
            user: { ...user, business: business ?? undefined },
            isAuthenticated: true,
          });

          // Mirror store/theme into businessStore. Dynamic import avoids the
          // authStore <-> businessStore cycle (same pattern as logout).
          try {
            const businessStore = (await import("@/store/businessStore")).default;
            businessStore.getState().hydrateFromBusiness(business ?? null);
          } catch (e) {
            console.error("Failed to hydrate business store from /me:", e);
          }

          return { user, business };
        } catch (error) {
          handleAxiosError(error);
        }
      },

      // W2.7: retained for existing callers — now thin, deterministic wrappers
      // over getMe (no retry loop / /business polling).
      fetchAndSetCurrentUserBusiness: async () => {
        await useAuthStore.getState().getMe();
      },

      fetchAndFixBusinessId: async () => {
        await useAuthStore.getState().getMe();
        return useAuthStore.getState().user?.business?.id || null;
      },

      // Add the clearState action
      clearUserState: () => {
        set({
          isLoading: false,
          isLoginLoading: false,
          error: null,
          isAuthenticated: false,
          user: null,
          otpData: null,
          token: null,
          authtypes: "",
        });
        Cookies.remove("accessToken");
        Cookies.remove("refreshToken");
      },
    }),
    {
      name: "user",
      storage: createJSONStorage(() => localStorage),
      // W2.3: persist only non-sensitive identity. Access/refresh tokens live in
      // cookies (client.ts reads them there); persisting them to localStorage made
      // them XSS-exfiltratable. Transient flags/OTP are intentionally not persisted.
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
