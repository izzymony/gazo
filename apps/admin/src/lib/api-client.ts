/**
 * An HTTP failure that keeps what the server said.
 *
 * `message` is the server's own text when it sent any, so existing callers
 * reading `error.message` show something useful without changing. `status` and
 * `payload` are there for the cases that need to branch — a 503 from a disabled
 * subsystem is not the same thing as a 400.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly payload: Record<string, unknown>;
  readonly reason?: string;

  constructor(message: string, status: number, payload: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
    this.reason = typeof payload.reason === 'string' ? payload.reason : undefined;
  }
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8088/api/v1';
    
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('admin_token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_token', token);
    }
  }

  removeToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // R10: read the token fresh per request. This client is a module singleton
    // constructed before login writes the token, so the constructor-cached value
    // goes stale — a first login in a fresh browser fired unauthenticated.
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('admin_token') : this.token;
    this.token = token;

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        if (response.status === 401) {
          // Only redirect if not already on login page
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
            this.removeToken();
            window.location.href = '/auth/login';
          }
        }
        // The server's explanation used to be thrown away here, so every
        // failure in the admin app read "HTTP error! status: 400" — including
        // ones written for the admin, like a withdrawal that could not be
        // approved because payouts are switched off. The body is parsed when
        // there is one, and the status is carried so callers can tell "this
        // request was wrong" from "the platform cannot do this right now".
        let payload: Record<string, unknown> = {};
        try {
          payload = await response.json();
        } catch {
          // Not JSON, or empty. The status is still meaningful.
        }
        const detail =
          typeof payload.error === 'string'
            ? payload.error
            : typeof payload.message === 'string'
              ? payload.message
              : `HTTP error! status: ${response.status}`;
        throw new ApiError(detail, response.status, payload);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication
  async login(credentials: { email: string; password: string }) {
    const response = await this.request<{
      data: {
        token: string;
        admin_id: string;
        email: string;
        name: string;
        role: string;
        permissions: any;
        expires_at: string;
      };
      message: string;
    }>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    this.setToken(response.data.token);
    return response;
  }

  async logout() {
    try {
      await this.request('/admin/auth/logout', {
        method: 'POST',
      });
    } finally {
      this.removeToken();
    }
  }

  async getProfile() {
    return this.request<{
      data: {
        admin_id: string;
        email: string;
        name: string;
        role: string;
        permissions: any;
        created_at: string;
        last_login_at: string;
      };
    }>('/admin/profile');
  }

  // Dashboard metrics
  async getDashboardStats() {
    return this.request<{
      data: {
        total_users: number;
        total_businesses: number;
        total_products: number;
        total_orders: number;
        total_revenue: number;
        pending_withdrawals: number;
        pending_kyc: number;
      };
    }>('/admin/dashboard/stats');
  }

  // Users management
  async getAllUsers(page = 1, limit = 20, search = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
    });
    
    return this.request<{
      data: {
        message: string;
        data: any[];
      };
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }>(`/admin/get-users?${params}`);
  }

  async getUser(userId: string) {
    return this.request<{
      data: any;
    }>(`/admin/get-user/${userId}`);
  }

  async updateUser(userId: string, data: any) {
    return this.request(`/admin/update-user/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(userId: string) {
    return this.request(`/admin/delete-user/${userId}`, {
      method: 'DELETE',
    });
  }

  // Business management
  async getAllBusinesses(page = 1, limit = 20, search = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
    });
    
    return this.request<{
      data: {
        message: string;
        data: any[];
      };
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }>(`/admin/get-businesses?${params}`);
  }

  async getBusiness(businessId: string) {
    return this.request<{
      data: any;
    }>(`/admin/get-business/${businessId}`);
  }

  // Products management
  async getAllProducts(page = 1, limit = 20, search = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
    });
    
    return this.request<{
      data: { message: string; data: any[] };
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }>(`/admin/get-products?${params}`);
  }

  async getProduct(productId: string) {
    return this.request<{
      data: any;
    }>(`/admin/get-product/${productId}`);
  }

  // Orders management
  async getAllOrders(page = 1, limit = 20, search = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
    });
    
    return this.request<{
      data: { message: string; data: any[] };
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }>(`/admin/get-orders?${params}`);
  }

  async getOrderItems(orderId: string) {
    return this.request<{
      data: any[];
    }>(`/admin/get-order-items/${orderId}`);
  }

  // Get all order items (matching seller dashboard format)
  async getAllOrderItemsList(page = 1, limit = 20) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    return this.request<{
      data: {
        data: any[];
      };
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }>(`/admin/get-all-order-items?${params}`);
  }

  // Financial management
  async getAllWithdrawalRequests(page = 1, limit = 20, status = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
    });
    
    return this.request<{
      data: { message: string; data: any[] };
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }>(`/admin/get-withdrawal-requests?${params}`);
  }

  async approveWithdrawal(withdrawalId: string) {
    return this.request(`/admin/approve-withdrawal-request/${withdrawalId}`, {
      method: 'PATCH',
    });
  }

  async rejectWithdrawal(withdrawalId: string, reason: string) {
    return this.request(`/admin/reject-withdrawal-request/${withdrawalId}`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  }

  async getWalletBalances(businessId: string) {
    return this.request<{
      data: any;
    }>(`/admin/get-wallet-balances/${businessId}`);
  }

  async getWalletTransactions(businessId: string, page = 1, limit = 20) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    return this.request<{
      data: {
        transactions: any[];
        pagination: {
          current_page: number;
          total_pages: number;
          total_count: number;
          per_page: number;
        };
      };
    }>(`/admin/get-wallet-transactions/${businessId}?${params}`);
  }

  // KYC management
  async getAllKYC(page = 1, limit = 20, status = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
    });
    
    return this.request<{
      data: {
        kyc_submissions: any[];
        pagination: {
          current_page: number;
          total_pages: number;
          total_count: number;
          per_page: number;
        };
      };
    }>(`/admin/kyc?${params}`);
  }

  async reviewKYC(kycId: string, status: 'approved' | 'rejected', reason?: string) {
    return this.request(`/admin/kyc/${kycId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
  }

  // Shipping management
  async getAllShipments(page = 1, limit = 20) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    return this.request<{
      data: { message: string; data: any[] };
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }>(`/admin/get-shipments?${params}`);
  }

  async getShipment(shipmentId: string) {
    return this.request<{
      data: any;
    }>(`/admin/get-shipment/${shipmentId}`);
  }

  // Update shipping status (manual override for failed webhooks)
  async updateShippingStatus(orderItemId: string, status: string, reason: string, notes?: string) {
    return this.request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/admin/update-shipping-status/${orderItemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason, notes }),
    });
  }

  // Get single order item details
  async getOrderItem(orderItemId: string) {
    return this.request<{
      data: any;
    }>(`/admin/get-order-item/${orderItemId}`);
  }

  // Delete order item (and reverse wallet transactions)
  async deleteOrderItem(orderItemId: string) {
    return this.request<{
      message: string;
    }>(`/admin/delete-order-item/${orderItemId}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();