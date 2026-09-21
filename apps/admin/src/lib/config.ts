// API Configuration
import { API_VERSION, apiBase, apiOrigin } from './apiUrl';

export const API_CONFIG = {
  // Backend origin, WITHOUT the /api/vN suffix. Normalised, because this used
  // to append the version to whatever NEXT_PUBLIC_API_URL contained — and the
  // docs told operators to set it to the same (already versioned) value as
  // NEXT_PUBLIC_API_BASE_URL, producing /api/v1/api/v1 and a 404 on login.
  BASE_URL: apiOrigin(process.env.NEXT_PUBLIC_API_URL),

  // API Version
  VERSION: API_VERSION,

  // Full API URL — the version appears exactly once, whichever form the
  // environment supplied.
  get API_URL() {
    return apiBase(process.env.NEXT_PUBLIC_API_URL);
  },
  
  // Admin endpoints
  ENDPOINTS: {
    ADMIN_LOGIN: '/admin/auth/login',
    ADMIN_LOGOUT: '/admin/auth/logout', 
    ADMIN_REFRESH: '/admin/auth/refresh',
    ADMIN_PROFILE: '/admin/profile',
    ADMIN_CHANGE_PASSWORD: '/admin/auth/change-password',
    ADMIN_AUDIT_LOGS: '/admin/audit-logs',
  }
};

// Request timeout configuration
export const REQUEST_TIMEOUT = 10000; // 10 seconds

// Error messages
export const API_ERRORS = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  TIMEOUT_ERROR: 'Request timeout. Please try again.',
  UNAUTHORIZED: 'Session expired. Please login again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
} as const;