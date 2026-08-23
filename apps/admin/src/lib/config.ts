// API Configuration
export const API_CONFIG = {
  // Backend API Base URL
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8088',
  
  // API Version
  VERSION: 'v1',
  
  // Full API URL
  get API_URL() {
    return `${this.BASE_URL}/api/${this.VERSION}`;
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