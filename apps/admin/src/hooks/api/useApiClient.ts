import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApiClient<T = any>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async <R = T>(
    apiCall: () => Promise<R>
  ): Promise<R | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await apiCall();
      setState({ data: result as T, loading: false, error: null });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

// Authentication hooks
export function useAuth() {
  const { data, loading, error, execute, reset } = useApiClient();
  
  const login = useCallback(async (credentials: { email: string; password: string }) => {
    const result = await execute(() => apiClient.login(credentials));
    if (result && typeof window !== 'undefined') {
      localStorage.setItem('admin_data', JSON.stringify(result.data));
    }
    return result;
  }, [execute]);

  const logout = useCallback(async () => {
    await execute(() => apiClient.logout());
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_data');
    }
  }, [execute]);

  const getProfile = useCallback(async () => {
    return execute(() => apiClient.getProfile());
  }, [execute]);

  return {
    data,
    loading,
    error,
    login,
    logout,
    getProfile,
    reset,
  };
}

// Dashboard hooks
export function useDashboard() {
  const { data, loading, error, execute } = useApiClient();

  const getStats = useCallback(async () => {
    return execute(() => apiClient.getDashboardStats());
  }, [execute]);

  return {
    stats: data,
    loading,
    error,
    getStats,
  };
}

// Users management hooks
export function useUsers() {
  const { data, loading, error, execute } = useApiClient();

  const getUsers = useCallback(async (page = 1, limit = 20, search = '') => {
    return execute(() => apiClient.getAllUsers(page, limit, search));
  }, [execute]);

  const getUser = useCallback(async (userId: string) => {
    return execute(() => apiClient.getUser(userId));
  }, [execute]);

  const updateUser = useCallback(async (userId: string, userData: any) => {
    return execute(() => apiClient.updateUser(userId, userData));
  }, [execute]);

  const deleteUser = useCallback(async (userId: string) => {
    return execute(() => apiClient.deleteUser(userId));
  }, [execute]);

  return {
    users: data,
    loading,
    error,
    getUsers,
    getUser,
    updateUser,
    deleteUser,
  };
}

// Business management hooks
export function useBusinesses() {
  const { data, loading, error, execute } = useApiClient();

  const getBusinesses = useCallback(async (page = 1, limit = 20, search = '') => {
    return execute(() => apiClient.getAllBusinesses(page, limit, search));
  }, [execute]);

  const getBusiness = useCallback(async (businessId: string) => {
    return execute(() => apiClient.getBusiness(businessId));
  }, [execute]);

  return {
    businesses: data,
    loading,
    error,
    getBusinesses,
    getBusiness,
  };
}

// Products management hooks
export function useProducts() {
  const { data, loading, error, execute } = useApiClient();

  const getProducts = useCallback(async (page = 1, limit = 20, search = '') => {
    return execute(() => apiClient.getAllProducts(page, limit, search));
  }, [execute]);

  const getProduct = useCallback(async (productId: string) => {
    return execute(() => apiClient.getProduct(productId));
  }, [execute]);

  return {
    products: data,
    loading,
    error,
    getProducts,
    getProduct,
  };
}

// Orders management hooks
export function useOrders() {
  const { data, loading, error, execute } = useApiClient();

  const getOrders = useCallback(async (page = 1, limit = 20, search = '') => {
    return execute(() => apiClient.getAllOrders(page, limit, search));
  }, [execute]);

  const getOrderItems = useCallback(async (orderId: string) => {
    return execute(() => apiClient.getOrderItems(orderId));
  }, [execute]);

  return {
    orders: data,
    loading,
    error,
    getOrders,
    getOrderItems,
  };
}

// Financial management hooks
export function useFinancial() {
  const { data, loading, error, execute } = useApiClient();

  const getWithdrawals = useCallback(async (page = 1, limit = 20, status = '') => {
    return execute(() => apiClient.getAllWithdrawalRequests(page, limit, status));
  }, [execute]);

  const approveWithdrawal = useCallback(async (withdrawalId: string) => {
    return execute(() => apiClient.approveWithdrawal(withdrawalId));
  }, [execute]);

  const rejectWithdrawal = useCallback(async (withdrawalId: string, reason: string) => {
    return execute(() => apiClient.rejectWithdrawal(withdrawalId, reason));
  }, [execute]);

  const getWalletBalances = useCallback(async (businessId: string) => {
    return execute(() => apiClient.getWalletBalances(businessId));
  }, [execute]);

  const getWalletTransactions = useCallback(async (businessId: string, page = 1, limit = 20) => {
    return execute(() => apiClient.getWalletTransactions(businessId, page, limit));
  }, [execute]);

  return {
    withdrawals: data,
    loading,
    error,
    getWithdrawals,
    approveWithdrawal,
    rejectWithdrawal,
    getWalletBalances,
    getWalletTransactions,
  };
}

// KYC management hooks
export function useKYC() {
  const { data, loading, error, execute } = useApiClient();

  const getKYCSubmissions = useCallback(async (page = 1, limit = 20, status = '') => {
    return execute(() => apiClient.getAllKYC(page, limit, status));
  }, [execute]);

  const reviewKYC = useCallback(async (kycId: string, status: 'approved' | 'rejected', reason?: string) => {
    return execute(() => apiClient.reviewKYC(kycId, status, reason));
  }, [execute]);

  return {
    kyc: data,
    loading,
    error,
    getKYCSubmissions,
    reviewKYC,
  };
}

// Shipping management hooks
export function useShipping() {
  const { data, loading, error, execute } = useApiClient();

  const getShipments = useCallback(async (page = 1, limit = 20) => {
    return execute(() => apiClient.getAllShipments(page, limit));
  }, [execute]);

  const getShipment = useCallback(async (shipmentId: string) => {
    return execute(() => apiClient.getShipment(shipmentId));
  }, [execute]);

  return {
    shipments: data,
    loading,
    error,
    getShipments,
    getShipment,
  };
}