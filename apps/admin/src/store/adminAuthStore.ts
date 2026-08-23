import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import adminAuthService, { LoginResponse, AdminProfile } from '@/services/adminAuthService';

// Safe localStorage wrapper that handles SSR and Node.js 25.x broken localStorage
const safeLocalStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(name, value);
    } catch {
      // Ignore storage errors
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(name);
    } catch {
      // Ignore storage errors
    }
  },
};

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar: string | null;
  permissions: Record<string, any>;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
}

interface AdminAuthState {
  // State
  admin: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isHydrated: boolean; // NEW: Track hydration status

  // Actions
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  checkAuth: () => boolean;
  hasPermission: (permission: string) => boolean;
  clearError: () => void;
  updateProfile: (name?: string, email?: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<void>;
  
  // Utility actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      admin: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isHydrated: false, // NEW: Start as not hydrated

      // Login function with real API
      login: async (email: string, password: string, rememberMe = false) => {
        set({ isLoading: true, error: null });

        try {
          const loginResponse: LoginResponse = await adminAuthService.login({
            email,
            password,
            remember: rememberMe,
          });

          // Transform API response to our AdminUser format
          const adminUser: AdminUser = {
            id: loginResponse.admin_id,
            email: loginResponse.email,
            name: loginResponse.name,
            role: loginResponse.role,
            avatar: null, // Not provided by API yet
            permissions: loginResponse.permissions,
            is_active: true, // Assume active if login successful
            created_at: new Date().toISOString(), // Not provided by login response
          };

          set({
            admin: adminUser,
            token: loginResponse.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            isHydrated: true, // Ensure hydration flag is set after login
          });

          // Store token expiry based on remember me
          const expiresAt = new Date(loginResponse.expires_at);
          localStorage.setItem('adminTokenExpiry', expiresAt.getTime().toString());

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';

          set({
            isLoading: false,
            error: errorMessage,
            admin: null,
            token: null,
            isAuthenticated: false,
          });

          throw error;
        }
      },

      // Logout function with real API
      logout: async () => {
        set({ isLoading: true });
        
        try {
          await adminAuthService.logout();
        } catch (error) {
          // Continue with logout even if API call fails
          console.warn('Logout API call failed:', error);
        } finally {
          // Always clear local state
          set({
            admin: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
          
          // Clear local storage
          localStorage.removeItem('adminTokenExpiry');
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_profile');
        }
      },

      // Refresh token function
      refreshToken: async () => {
        try {
          const refreshResponse = await adminAuthService.refreshToken();
          
          // Update admin data with refreshed info
          const adminUser: AdminUser = {
            id: refreshResponse.admin_id,
            email: refreshResponse.email,
            name: refreshResponse.name,
            role: refreshResponse.role,
            avatar: null,
            permissions: refreshResponse.permissions,
            is_active: true,
            created_at: get().admin?.created_at || new Date().toISOString(),
          };
          
          set({
            admin: adminUser,
            token: refreshResponse.token,
            isAuthenticated: true,
            error: null,
          });

          // Update token expiry
          const expiresAt = new Date(refreshResponse.expires_at);
          localStorage.setItem('adminTokenExpiry', expiresAt.getTime().toString());
          
        } catch (error) {
          // If refresh fails, logout user
          get().logout();
          throw error;
        }
      },

      // Check if user is authenticated and token hasn't expired
      checkAuth: () => {
        const state = get();

        // Don't check auth if not hydrated yet
        if (!state.isHydrated) {
          return false;
        }

        // If no token or admin, return false (don't auto-logout)
        if (!state.token || !state.admin) {
          return false;
        }

        // Check if adminAuthService considers user authenticated
        if (!adminAuthService.isAuthenticated()) {
          return false;
        }

        // Check token expiry from localStorage
        const expiry = localStorage.getItem('adminTokenExpiry');
        if (expiry && Date.now() > parseInt(expiry)) {
          // Token expired - logout silently
          set({
            admin: null,
            token: null,
            isAuthenticated: false,
          });
          return false;
        }

        return true;
      },

      // Check if user has specific permission
      hasPermission: (permission: string) => {
        const state = get();
        if (!state.admin || !state.isAuthenticated) return false;
        
        // Super admin role has all permissions
        if (state.admin.role === 'super_admin') return true;
        
        // Admin role has all permissions except super admin actions
        if (state.admin.role === 'admin') return true;
        
        // Check specific permissions in the permissions object
        if (state.admin.permissions && typeof state.admin.permissions === 'object') {
          // Check if permission exists in any resource category
          for (const [resource, actions] of Object.entries(state.admin.permissions)) {
            if (Array.isArray(actions) && actions.includes(permission)) {
              return true;
            }
            if (resource === permission) {
              return true;
            }
          }
        }
        
        return false;
      },

      // Clear error state
      clearError: () => {
        set({ error: null });
      },

      // Update profile
      updateProfile: async (name?: string, email?: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const updateData: { name?: string; email?: string } = {};
          if (name) updateData.name = name;
          if (email) updateData.email = email;
          
          const updatedProfile = await adminAuthService.updateProfile(updateData);
          
          // Update local state with new profile data
          const currentAdmin = get().admin;
          if (currentAdmin) {
            const updatedAdmin: AdminUser = {
              ...currentAdmin,
              id: updatedProfile.id,
              email: updatedProfile.email,
              name: updatedProfile.name,
              role: updatedProfile.role,
              permissions: updatedProfile.permissions,
              is_active: updatedProfile.is_active,
              last_login_at: updatedProfile.last_login_at,
              created_at: updatedProfile.created_at,
            };
            
            set({
              admin: updatedAdmin,
              isLoading: false,
              error: null,
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Change password
      changePassword: async (currentPassword: string, newPassword: string, confirmPassword: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await adminAuthService.changePassword({
            current_password: currentPassword,
            new_password: newPassword,
            confirm_password: confirmPassword,
          });
          
          set({
            isLoading: false,
            error: null,
          });
          
          // Password change successful, token will be invalidated by backend
          // User will need to login again
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Password change failed';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Utility actions
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },
    }),
    {
      name: 'admin-auth-storage',
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (state) => ({
        admin: state.admin,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        // Don't persist error, isLoading, or isHydrated
      }),
      // Custom storage handling for token synchronization
      onRehydrateStorage: () => (state, error) => {
        // Handle hydration errors (corrupted localStorage)
        if (error) {
          console.error('Hydration error, clearing corrupted state:', error);
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem('admin-auth-storage');
              localStorage.removeItem('admin_token');
            } catch (e) {
              // Ignore localStorage errors
            }
          }
        }

        // Always mark hydration complete using setTimeout to ensure store is ready
        setTimeout(() => {
          useAdminAuthStore.setState({ isHydrated: true, error: null });
        }, 0);

        if (state) {
          // Clear any persisted error
          state.error = null;

          // Sync token with localStorage (only in browser)
          if (typeof window !== 'undefined') {
            const storedToken = localStorage.getItem('admin_token');
            if (storedToken && state.token && storedToken !== state.token) {
              state.token = storedToken;
            }
          }
        }
      },
    }
  )
);

export default useAdminAuthStore;