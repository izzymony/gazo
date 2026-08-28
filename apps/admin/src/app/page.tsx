"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAdminAuthStore from '@/store/adminAuthStore';

export default function HomePage() {
  const router = useRouter();
  const { checkAuth } = useAdminAuthStore();

  useEffect(() => {
    // Check authentication and redirect accordingly
    const isAuthenticated = checkAuth();
    
    if (isAuthenticated) {
      router.replace('/dashboard');
    } else {
      router.replace('/auth/login');
    }
  }, [router, checkAuth]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}