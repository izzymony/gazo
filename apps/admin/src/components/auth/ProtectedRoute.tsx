"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useAdminAuthStore from '@/store/adminAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({
  children,
  requiredPermission,
  fallback = null
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { checkAuth, hasPermission, isAuthenticated, isHydrated } = useAdminAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Wait for Zustand hydration to complete
    if (!isHydrated) {
      return;
    }

    // Skip auth check if already on auth pages
    if (pathname?.startsWith('/auth/')) {
      setIsChecking(false);
      return;
    }

    // Check authentication
    const isAuth = checkAuth();

    if (!isAuth) {
      // Redirect to login if not authenticated
      router.replace('/auth/login');
      return;
    }

    // Check specific permission if required
    if (requiredPermission && !hasPermission(requiredPermission)) {
      console.warn(`Access denied: Missing permission '${requiredPermission}'`);
    }

    setIsChecking(false);
  }, [checkAuth, hasPermission, router, requiredPermission, pathname, isHydrated]);

  // Show loading state while checking or hydrating
  if (!isHydrated || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render protected content if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Show fallback if permission required but not granted
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600">You don't have permission to access this section.</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-brand text-white rounded-lg hover:bg-brandDark transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
