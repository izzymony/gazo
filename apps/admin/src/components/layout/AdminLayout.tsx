"use client";

import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Store, 
  Package, 
  ShoppingCart,
  DollarSign,
  Headphones,
  BarChart3,
  Settings,
  Menu,
  X,
  Bell,
  Search,
  ChevronDown,
  Truck,
  Shield,
  User,
  LogOut,
  UserCircle
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import useAdminAuthStore from "@/store/adminAuthStore";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { H1, H2, Text } from "@/components/common/Typography";
import Logo from "@/components/common/Logo";
import { apiClient } from "@/lib/api-client";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "User Management", href: "/users", icon: Users },
  { name: "Business Management", href: "/businesses", icon: Store },
  { name: "KYC / Verification", href: "/kyc", icon: Shield },
  { name: "Product Management", href: "/products", icon: Package },
  { name: "Order Management", href: "/orders", icon: ShoppingCart },
  { name: "Shipping Management", href: "/shipping", icon: Truck },
  { name: "Support System", href: "/support", icon: Headphones },
  { name: "Financial Operations", href: "/financial", icon: DollarSign },
  { name: "Analytics & Reports", href: "/analytics", icon: BarChart3 },
  { name: "System Settings", href: "/settings", icon: Settings },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [pendingKyc, setPendingKyc] = useState(0);

  // KYC1 §8.3: pending-verification count for the nav badge.
  useEffect(() => {
    let active = true;
    apiClient
      .getDashboardStats()
      .then((res) => { if (active) setPendingKyc(res?.data?.pending_kyc ?? 0); })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const pathname = usePathname();
  const router = useRouter();
  
  const { admin, logout, hasPermission } = useAdminAuthStore();


  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Still redirect to login even if logout API call fails
      router.push('/auth/login');
    }
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserMenu && !(event.target as Element).closest('[data-user-menu]')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Filter navigation based on user permissions
  const getFilteredNavigation = () => {
    if (!admin) return navigation;
    
    return navigation.filter(item => {
      // Admin role can see everything
      if (admin.role === 'admin') return true;
      
      // Operations role restrictions
      if (admin.role === 'operations') {
        // Hide Financial Operations for operations role
        return item.name !== "Financial Operations";
      }
      
      return true;
    });
  };

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <div className={`${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col`}>
        
        {/* User Profile Section */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center flex-1 relative" data-user-menu>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center flex-1 hover:bg-gray-800 rounded-lg p-2 -m-2 transition-colors"
            >
              <div className="w-10 h-10 bg-brand rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {admin?.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'A'}
                </span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-white font-medium text-sm">{admin?.name || 'Admin User'}</p>
                <p className="text-gray-400 text-xs">{admin?.email || 'admin@vibaar.com'}</p>
                <div className="flex items-center mt-1">
                  <Shield className="h-3 w-3 text-gray-400 mr-1" />
                  <span className="text-gray-400 text-xs capitalize">{admin?.role || 'admin'} Role</span>
                </div>
              </div>
              <ChevronDown className={`ml-auto h-4 w-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{admin?.name}</p>
                  <p className="text-xs text-gray-500">{admin?.email}</p>
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand/10 text-brandDeep capitalize">
                      {admin?.role}
                    </span>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      // TODO: Navigate to profile page
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <User className="mr-3 h-4 w-4" />
                    Profile Settings
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      // TODO: Navigate to security settings
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Shield className="mr-3 h-4 w-4" />
                    Security
                  </button>

                  <div className="border-t border-gray-100 my-1"></div>
                  
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white ml-2"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-4 px-3">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider px-3 mb-3">
            MENU
          </p>
          <ul className="space-y-1">
            {getFilteredNavigation().map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`${
                      isActive 
                        ? 'bg-brand text-brandInk' 
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    } group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors`}
                  >
                    <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    <span className="flex-1">{item.name}</span>
                    {item.href === "/kyc" && pendingKyc > 0 && (
                      <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white px-1.5 text-xs font-semibold text-red-600">
                        {pendingKyc > 99 ? "99+" : pendingKyc}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        {/* Logo at bottom */}
        <div className="mt-auto p-6 border-t border-gray-800">
          <div className="flex items-center justify-center">
            <Logo variant="full" width={120} height={22} textColor="white" className="opacity-60" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-soft border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Page title area */}
            <div className="flex-1 lg:flex lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <H1 className="text-2xl font-bold text-gray-900 lg:truncate text-left">
                    {pathname === '/dashboard' && 'Dashboard'}
                    {(pathname === '/users' || pathname.startsWith('/users/')) && 'User Management'}
                    {(pathname === '/businesses' || pathname.startsWith('/businesses/')) && 'Business Management'}
                    {(pathname === '/products' || pathname.startsWith('/products/')) && 'Product Management'}
                    {(pathname === '/orders' || pathname.startsWith('/orders/')) && 'Order Management'}
                    {(pathname === '/shipping' || pathname.startsWith('/shipping/')) && 'Shipping Management'}
                    {(pathname === '/support' || pathname.startsWith('/support/')) && 'Support System'}
                    {(pathname === '/financials' || pathname.startsWith('/financials/')) && 'Financial Operations'}
                    {pathname === '/analytics' && 'Analytics & Reports'}
                    {pathname === '/settings' && 'System Settings'}
                  </H1>
                  {/* Page status indicator */}
                  <div className="hidden sm:flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-xs text-green-600 font-medium">Live</span>
                  </div>
                </div>
                <div className="flex items-center mt-1 space-x-4">
                  <Text variant="muted" className="text-sm text-gray-500">
                    {pathname === '/dashboard' && 'Monitor platform performance and admin activities'}
                    {(pathname === '/users' || pathname.startsWith('/users/')) && 'Manage buyers, vendors, and platform users'}
                    {(pathname === '/businesses' || pathname.startsWith('/businesses/')) && 'Oversee business verification and store management'}
                    {(pathname === '/products' || pathname.startsWith('/products/')) && 'Manage and monitor all platform products and inventory'}
                    {(pathname === '/orders' || pathname.startsWith('/orders/')) && 'Handle orders, disputes, and refunds'}
                    {(pathname === '/shipping' || pathname.startsWith('/shipping/')) && 'Monitor shipments and delivery operations'}
                    {(pathname === '/support' || pathname.startsWith('/support/')) && 'Respond to tickets and manage support requests'}
                    {(pathname === '/financials' || pathname.startsWith('/financials/')) && 'Process withdrawals and monitor transactions'}
                    {pathname === '/analytics' && 'View platform analytics and generate reports'}
                    {pathname === '/settings' && 'Configure system settings and preferences'}
                  </Text>
                  <div className="hidden md:flex items-center text-xs text-gray-400">
                    <span>Last updated: {new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>

              {/* Header actions */}
              <div className="flex items-center space-x-3 ml-4">
                
                {/* Quick Actions Dropdown */}
                <div className="relative">
                  <button className="flex items-center px-4 h-10 text-sm font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                    Quick Actions
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </button>
                </div>

                {/* Search */}
                <div className="hidden lg:block">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-full text-sm focus:ring-2 focus:ring-brandDeep focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Notifications */}
                <div className="relative">
                  <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1 right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-brand"></span>
                    </span>
                  </button>
                </div>

              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      </div>
    </ProtectedRoute>
  );
}