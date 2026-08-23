import Axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import Cookies from "js-cookie";

interface ClientParams {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";
  data?: unknown;
  queryParams?: Record<string, unknown>;
  contentType?: string;
  headers?: Record<string, string>;
  /** Per-call timeout override (ms). Defaults: 30s reads, 60s multipart uploads. */
  timeout?: number;
}

type ClientResponse = AxiosResponse<unknown>;

// Store refresh promise to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
type RefreshSubscriber = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};
let refreshSubscribers: RefreshSubscriber[] = [];

const onRefreshed = (newToken: string) => {
  refreshSubscribers.forEach(({ resolve }) => resolve(newToken));
  refreshSubscribers = [];
};

// W2.1: when the refresh itself fails, reject every queued request instead of
// leaving them pending forever (the old code only ever resolved on success).
const onRefreshFailed = (error: unknown) => {
  refreshSubscribers.forEach(({ reject }) => reject(error));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (subscriber: RefreshSubscriber) => {
  refreshSubscribers.push(subscriber);
};

// Dynamic API URL detection for mobile and desktop support
const getBaseURL = () => {
  // Always use environment variable if available (production/staging)
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  
  // Fallback for local development without env variable
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Mobile/external access - use current hostname
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:8088/api/v1`;
    }
  }
  
  // Default localhost
  return 'http://localhost:8088/api/v1';
};

export const Client = async <T = unknown>(
  params: ClientParams
): Promise<AxiosResponse<T>> => {
  const token = Cookies.get("accessToken");
  const refreshToken = Cookies.get("refreshToken");
  const { path, method, data, queryParams, contentType, headers, timeout } = params;

  const baseURL = getBaseURL();

  // Prepare default headers
  const defaultHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  // Merge default headers with custom headers
  const finalHeaders = {
    ...defaultHeaders,
    ...(headers || {}),
  };

  // Set Content-Type
  if (!contentType || contentType === "application/json") {
    finalHeaders["Content-Type"] = "application/json";
  } else if (contentType !== "multipart/form-data") {
    finalHeaders["Content-Type"] = contentType;
  }

  const url = `${baseURL}${path}`;

  const axiosConfig: AxiosRequestConfig = {
    method,
    url,
    // Fast-fail reads so one slow endpoint can't freeze a page for ~a minute;
    // uploads (multipart) keep a generous window for 3G. Override per call.
    timeout: timeout ?? (contentType === "multipart/form-data" ? 60000 : 30000),
    headers: finalHeaders,
    params: queryParams,
    responseType: "json",
  };

  if (method.toUpperCase() !== "GET" && data) {
    axiosConfig.data =
      contentType === "multipart/form-data" ? data : JSON.stringify(data);
  }

  try {
    const response = await Axios(axiosConfig);
    return response;
  } catch (error) {
    if (Axios.isAxiosError(error) && error.response) {
      const { status } = error.response;

      // Handle 401 Unauthorized
      if (status === 401) {
        const originalRequest = axiosConfig;

        if (!isRefreshing) {
          isRefreshing = true;
          try {
            // Attempt to refresh the token
            if (!refreshToken) {
              throw new Error("No refresh token available");
            }

            // Call your refresh token endpoint
            const refreshResponse = await Axios.post(
              baseURL + "/refresh-token", // Adjust this endpoint to match your backend
              {
                refresh_token: refreshToken,
              },
              { headers: { "Content-Type": "application/json" } }
            );

            const newAccessToken = refreshResponse.data.data.access_token;
            const newRefreshToken = refreshResponse.data.data.refresh_token; // Optional, if provided

            // Update tokens in cookies
            Cookies.set("accessToken", newAccessToken, { expires: 2 });
            if (newRefreshToken) {
              Cookies.set("refreshToken", newRefreshToken, { expires: 10 });
            }

            // Notify subscribers of the new token
            onRefreshed(newAccessToken);

            // Retry the original request with the new token
            originalRequest.headers = {
              ...originalRequest.headers,
              Authorization: `Bearer ${newAccessToken}`,
            };
            return await Axios(originalRequest);
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
            // Always fail the queued requests so they don't hang forever (W2.1).
            onRefreshFailed(refreshError);
            // Only treat this as a DEAD SESSION — clear tokens + bounce to
            // sign-in — if the request was actually authenticated. A guest
            // (no access token AND no refresh token) hitting an auth-only
            // endpoint gets an expected 401: reject it, but NEVER hard-redirect.
            // That redirect is what kicked guests off /shop, storefronts, and
            // the add-address step. Seller routes stay protected by the
            // middleware, so relaxing this can't leak the seller side.
            const hadSession = Boolean(token) || Boolean(refreshToken);
            if (hadSession) {
              Cookies.remove("accessToken");
              Cookies.remove("refreshToken");
              if (typeof window !== "undefined") {
                window.location.href = "/signin?step=1";
              }
            }
            throw refreshError;
          } finally {
            isRefreshing = false;
          }
        }

        // Queue requests while a refresh is in flight; resolve on success,
        // reject if the refresh fails (W2.1).
        return new Promise<AxiosResponse<T>>((resolve, reject) => {
          addRefreshSubscriber({
            resolve: (newToken: string) => {
              originalRequest.headers = {
                ...originalRequest.headers,
                Authorization: `Bearer ${newToken}`,
              };
              resolve(Axios(originalRequest));
            },
            reject,
          });
        });
      }

      // Log detailed error response for other errors
      console.error("Response Error Data:", error.response.data);
      throw error; // Rethrow non-401 errors
    }

    console.error("Error in Axios request:", error);
    throw error; // Rethrow network or other errors
  }
};
