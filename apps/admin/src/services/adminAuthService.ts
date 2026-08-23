import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { API_CONFIG, REQUEST_TIMEOUT, API_ERRORS } from '@/lib/config';

// Types for API requests and responses
export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  admin_id: string;
  email: string;
  name: string;
  role: string;
  permissions: Record<string, any>;
  token: string;
  expires_at: string;
}

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: Record<string, any>;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
}

export interface RefreshTokenResponse {
  admin_id: string;
  email: string;
  name: string;
  role: string;
  permissions: Record<string, any>;
  token: string;
  expires_at: string;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  admin_id?: string;
  action?: string;
  resource_type?: string;
  start_date?: string;
  end_date?: string;
}

export interface AuditLog {
  id: string;
  admin_id?: string;
  admin_email: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  status: string;
  created_at: string;
  admin?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    limit: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

class AdminAuthService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_CONFIG.API_URL,
      timeout: REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getStoredToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Only redirect if not already on auth pages
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
            this.clearStoredAuth();
            window.location.href = '/auth/login';
          }
        }
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  // Helper methods for token storage
  private getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('admin_token');
  }

  private setStoredToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('admin_token', token);
  }

  private clearStoredAuth(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_profile');
    localStorage.removeItem('admin-auth-storage');
  }

  // Error handling
  private handleApiError(error: any): Error {
    if (error.code === 'ECONNABORTED') {
      return new Error(API_ERRORS.TIMEOUT_ERROR);
    }
    
    if (!error.response) {
      return new Error(API_ERRORS.NETWORK_ERROR);
    }

    const { status, data } = error.response;

    switch (status) {
      case 400:
        return new Error(data?.error || API_ERRORS.VALIDATION_ERROR);
      case 401:
        // Use actual error message from backend if available (e.g., "Invalid credentials")
        // Only fall back to "Session expired" for actual session expiry (no error message)
        return new Error(data?.error || API_ERRORS.UNAUTHORIZED);
      case 403:
        return new Error(API_ERRORS.FORBIDDEN);
      case 500:
        return new Error(API_ERRORS.SERVER_ERROR);
      default:
        return new Error(data?.error || API_ERRORS.SERVER_ERROR);
    }
  }

  // Admin Authentication Methods
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response: AxiosResponse<{ data: LoginResponse }> = await this.api.post(
        API_CONFIG.ENDPOINTS.ADMIN_LOGIN,
        credentials
      );

      const loginData = response.data.data;

      // Store token for future requests
      this.setStoredToken(loginData.token);

      return loginData;
    } catch (error) {
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.api.post(API_CONFIG.ENDPOINTS.ADMIN_LOGOUT);
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear stored auth data
      this.clearStoredAuth();
    }
  }

  async refreshToken(): Promise<RefreshTokenResponse> {
    try {
      const response: AxiosResponse<{ data: RefreshTokenResponse }> = await this.api.post(
        API_CONFIG.ENDPOINTS.ADMIN_REFRESH
      );
      
      const refreshData = response.data.data;
      
      // Update stored token
      this.setStoredToken(refreshData.token);
      
      return refreshData;
    } catch (error) {
      // If refresh fails, clear auth and redirect to login
      this.clearStoredAuth();
      throw error;
    }
  }

  async getProfile(): Promise<AdminProfile> {
    try {
      const response: AxiosResponse<{ data: AdminProfile }> = await this.api.get(
        API_CONFIG.ENDPOINTS.ADMIN_PROFILE
      );
      
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  async updateProfile(data: UpdateProfileRequest): Promise<AdminProfile> {
    try {
      const response: AxiosResponse<{ data: AdminProfile }> = await this.api.patch(
        API_CONFIG.ENDPOINTS.ADMIN_PROFILE,
        data
      );
      
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    try {
      await this.api.post(API_CONFIG.ENDPOINTS.ADMIN_CHANGE_PASSWORD, data);
    } catch (error) {
      throw error;
    }
  }

  async getAuditLogs(filters?: AuditLogFilters): Promise<AuditLogsResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.admin_id) params.append('admin_id', filters.admin_id);
      if (filters?.action) params.append('action', filters.action);
      if (filters?.resource_type) params.append('resource_type', filters.resource_type);
      if (filters?.start_date) params.append('start_date', filters.start_date);
      if (filters?.end_date) params.append('end_date', filters.end_date);
      
      const queryString = params.toString();
      const url = `${API_CONFIG.ENDPOINTS.ADMIN_AUDIT_LOGS}${queryString ? `?${queryString}` : ''}`;
      
      const response: AxiosResponse<{ data: AuditLogsResponse }> = await this.api.get(url);
      
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  // Utility method to check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getStoredToken();
  }

  // Method to get current token for debugging/testing
  getCurrentToken(): string | null {
    return this.getStoredToken();
  }
}

// Create and export singleton instance
const adminAuthService = new AdminAuthService();
export default adminAuthService;