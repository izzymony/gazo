"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/layout/AdminLayout";
import MetricCard from "@/components/common/MetricCard";
import SectionHeader from "@/components/common/SectionHeader";
import Section from "@/components/common/Section";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/common/Card";
import { H2, H3, Text } from "@/components/common/Typography";
import {
  Users,
  Store,
  ShoppingCart,
  DollarSign,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  Loader2,
  Activity
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface DashboardStats {
  totalUsers: number;
  totalBusinesses: number;
  totalProducts: number;
  totalOrders: number;
  pendingWithdrawals: number;
  pendingKYC: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalBusinesses: 0,
    totalProducts: 0,
    totalOrders: 0,
    pendingWithdrawals: 0,
    pendingKYC: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [usersRes, businessesRes, productsRes, ordersRes, withdrawalsRes, kycRes] = await Promise.all([
          apiClient.getAllUsers(1, 1).then(res => {
            console.log('Users API raw response:', res);
            return res;
          }).catch((err) => {
            console.error('Failed to fetch users:', err);
            return null;
          }),
          apiClient.getAllBusinesses(1, 1).then(res => {
            console.log('Businesses API raw response:', res);
            return res;
          }).catch((err) => {
            console.error('Failed to fetch businesses:', err);
            return null;
          }),
          apiClient.getAllProducts(1, 1).then(res => {
            console.log('Products API raw response:', res);
            return res;
          }).catch((err) => {
            console.error('Failed to fetch products:', err);
            return null;
          }),
          apiClient.getAllOrders(1, 1).then(res => {
            console.log('Orders API raw response:', res);
            return res;
          }).catch((err) => {
            console.error('Failed to fetch orders:', err);
            return null;
          }),
          apiClient.getAllWithdrawalRequests(1, 1, 'pending').then(res => {
            console.log('Withdrawals API raw response:', res);
            return res;
          }).catch((err) => {
            console.error('Failed to fetch withdrawals:', err);
            return null;
          }),
          apiClient.getAllKYC(1, 1, 'pending').then(res => {
            console.log('KYC API raw response:', res);
            return res;
          }).catch((err) => {
            console.error('Failed to fetch KYC:', err);
            return null;
          }),
        ]);

        // Extract counts from responses
        const extractCount = (response: any, name: string): number => {
          if (!response) {
            console.log(`${name}: No response`);
            return 0;
          }
          
          // Try different paths to find the total count
          const count = response?.data?.pagination?.total_count || 
                       response?.pagination?.total_count ||
                       response?.data?.total || 
                       response?.total || 
                       0;
          
          console.log(`${name} count:`, count, 'from response:', response);
          return count;
        };

        const newStats = {
          totalUsers: extractCount(usersRes, 'Users'),
          totalBusinesses: extractCount(businessesRes, 'Businesses'),
          totalProducts: extractCount(productsRes, 'Products'),
          totalOrders: extractCount(ordersRes, 'Orders'),
          pendingWithdrawals: extractCount(withdrawalsRes, 'Withdrawals'),
          pendingKYC: extractCount(kycRes, 'KYC'),
        };

        console.log('Setting dashboard stats:', newStats);
        setStats(newStats);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-brand" />
            <Text>Loading dashboard data...</Text>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <H3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Dashboard</H3>
            <Text className="text-gray-600 mb-4">{error}</Text>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brandDark transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8 space-y-8">
        
        {/* Platform Overview Section */}
        <Section>
          <SectionHeader 
            title="Platform Overview" 
            description="Key performance metrics and platform statistics"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Users"
              value={stats.totalUsers === 0 ? "0" : stats.totalUsers.toLocaleString()}
              change={stats.totalUsers > 0 ? "+Live Data" : (stats.totalUsers === 0 ? "No Data" : "Loading...")}
              changeType="neutral"
              icon={Users}
              iconColor="text-blue-500"
            />
            <MetricCard
              title="Active Businesses"
              value={stats.totalBusinesses === 0 ? "0" : stats.totalBusinesses.toLocaleString()}
              change={stats.totalBusinesses > 0 ? "+Live Data" : (stats.totalBusinesses === 0 ? "No Data" : "Loading...")}
              changeType="neutral"
              icon={Store}
              iconColor="text-purple-500"
            />
            <MetricCard
              title="Total Orders"
              value={stats.totalOrders === 0 ? "0" : stats.totalOrders.toLocaleString()}
              change={stats.totalOrders > 0 ? "+Live Data" : (stats.totalOrders === 0 ? "No Data" : "Loading...")}
              changeType="neutral"
              icon={ShoppingCart}
              iconColor="text-orange-500"
            />
            <MetricCard
              title="Total Products"
              value={stats.totalProducts === 0 ? "0" : stats.totalProducts.toLocaleString()}
              change={stats.totalProducts > 0 ? "+Live Data" : (stats.totalProducts === 0 ? "No Data" : "Loading...")}
              changeType="neutral"
              icon={Package}
              iconColor="text-green-500"
            />
          </div>
        </Section>

        {/* Operational Alerts Section */}
        <Section>
          <SectionHeader 
            title="Operational Alerts" 
            description="Critical actions and pending tasks requiring attention"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Pending Actions */}
            <button className="w-full bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 rounded-xl p-5 shadow-soft hover:shadow-md transition-all text-left group">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-red-500 rounded-xl group-hover:bg-red-600 transition-colors flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <H3 className="text-sm font-semibold text-red-800">Urgent Actions</H3>
                    </div>
                    <Text className="text-2xl font-bold text-red-900 leading-none mb-1">{stats.pendingWithdrawals}</Text>
                    <Text className="text-sm text-red-600/80">Pending Withdrawals</Text>
                  </div>
                </div>
                <div className="text-red-400 group-hover:text-red-500 transition-colors mt-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Verification Queue */}
            <button className="w-full bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 hover:border-yellow-300 rounded-xl p-5 shadow-soft hover:shadow-md transition-all text-left group">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-yellow-500 rounded-xl group-hover:bg-yellow-600 transition-colors flex-shrink-0">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <H3 className="text-sm font-semibold text-yellow-800">Pending Verification</H3>
                    </div>
                    <Text className="text-2xl font-bold text-yellow-900 leading-none mb-1">{stats.pendingKYC}</Text>
                    <Text className="text-sm text-yellow-600/80">Pending KYC Reviews</Text>
                  </div>
                </div>
                <div className="text-yellow-400 group-hover:text-yellow-500 transition-colors mt-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Support Tickets */}
            <button className="w-full bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 rounded-xl p-5 shadow-soft hover:shadow-md transition-all text-left group">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-blue-500 rounded-xl group-hover:bg-blue-600 transition-colors flex-shrink-0">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <H3 className="text-sm font-semibold text-blue-800">Open Tickets</H3>
                    </div>
                    <Text className="text-2xl font-bold text-blue-900 leading-none mb-1">156</Text>
                    <Text className="text-sm text-blue-600/80">Support Requests</Text>
                  </div>
                </div>
                <div className="text-blue-400 group-hover:text-blue-500 transition-colors mt-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>

          </div>
        </Section>

        {/* Activity and Actions Section */}
        <Section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Recent Activity Feed */}
            <Card padding={false}>
              <CardHeader>
                <H3 className="text-lg font-semibold text-gray-900">Recent Platform Activity</H3>
                <Text variant="muted" className="text-gray-600 text-sm mt-1">Latest platform events and updates</Text>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {/* Production: No hardcoded activity data */}
                  <div className="p-8 text-center">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Activity</h3>
                    <p className="text-gray-500">Platform activity will appear here when users take actions.</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <button className="text-brand text-sm font-medium hover:text-brandDark transition-colors">
                  View all activity
                </button>
              </CardFooter>
            </Card>

            {/* Quick Actions */}
            <Card padding={false}>
              <CardHeader>
                <H3 className="text-lg font-semibold text-gray-900">Quick Actions</H3>
                <Text variant="muted" className="text-gray-600 text-sm mt-1">Direct access to important admin tasks</Text>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  <button className="w-full flex items-center justify-between p-4 hover:bg-red-50 border-l-4 border-l-transparent hover:border-l-red-500 transition-all text-left group">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-500 transition-colors">
                        <AlertTriangle className="h-4 w-4 text-red-600 group-hover:text-white" />
                      </div>
                      <div>
                        <Text className="text-sm font-medium text-gray-900 group-hover:text-red-900">Review Urgent Disputes</Text>
                        <Text variant="small" className="text-xs text-gray-500">No cases need attention</Text>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 group-hover:bg-red-500 group-hover:text-white">
                        0
                      </span>
                      <div className="text-gray-400 group-hover:text-red-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => router.push("/kyc")}
                    className="w-full flex items-center justify-between p-4 hover:bg-yellow-50 border-l-4 border-l-transparent hover:border-l-yellow-500 transition-all text-left group">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-yellow-100 rounded-lg group-hover:bg-yellow-500 transition-colors">
                        <Clock className="h-4 w-4 text-yellow-600 group-hover:text-white" />
                      </div>
                      <div>
                        <Text className="text-sm font-medium text-gray-900 group-hover:text-yellow-900">Process Verifications</Text>
                        <Text variant="small" className="text-xs text-gray-500">{stats.pendingKYC} businesses awaiting review</Text>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 group-hover:bg-yellow-500 group-hover:text-white">
                        {stats.pendingKYC}
                      </span>
                      <div className="text-gray-400 group-hover:text-yellow-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                  
                  <button className="w-full flex items-center justify-between p-4 hover:bg-green-50 border-l-4 border-l-transparent hover:border-l-green-500 transition-all text-left group">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-500 transition-colors">
                        <DollarSign className="h-4 w-4 text-green-600 group-hover:text-white" />
                      </div>
                      <div>
                        <Text className="text-sm font-medium text-gray-900 group-hover:text-green-900">Approve Withdrawals</Text>
                        <Text variant="small" className="text-xs text-gray-500">{stats.pendingWithdrawals} pending approvals</Text>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 group-hover:bg-green-500 group-hover:text-white">
                        {stats.pendingWithdrawals}
                      </span>
                      <div className="text-gray-400 group-hover:text-green-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                  
                  <button className="w-full flex items-center justify-between p-4 hover:bg-blue-50 border-l-4 border-l-transparent hover:border-l-blue-500 transition-all text-left group">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-500 transition-colors">
                        <Shield className="h-4 w-4 text-blue-600 group-hover:text-white" />
                      </div>
                      <div>
                        <Text className="text-sm font-medium text-gray-900 group-hover:text-blue-900">Respond to Tickets</Text>
                        <Text variant="small" className="text-xs text-gray-500">156 open support requests</Text>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 group-hover:bg-blue-500 group-hover:text-white">
                        156
                      </span>
                      <div className="text-gray-400 group-hover:text-blue-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                </div>
              </CardContent>
            </Card>

          </div>
        </Section>

      </div>
    </AdminLayout>
  );
}