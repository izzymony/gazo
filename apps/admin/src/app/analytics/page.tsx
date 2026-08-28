"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import MetricCard from "@/components/common/MetricCard";
import SectionHeader from "@/components/common/SectionHeader";
import Section from "@/components/common/Section";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/common/Card";
import Button from "@/components/common/Button";
import DropdownButton from "@/components/common/DropdownButton";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Store,
  ShoppingCart,
  Download,
  Filter,
  RefreshCcw,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Activity,
  Target,
  Zap
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

// Production: No mock data - only real API data

// Production: No mock data - only real API data

// Production: No mock data - only real API data

// Production: No mock data - only real API data
const defaultMetrics = {
  totalRevenue: 0,
  totalCommission: 0,
  totalUsers: 0,
  activeBusinesses: 0,
  totalOrders: 0,
  avgOrderValue: 0,
  conversionRate: 0,
  customerRetentionRate: 0
};

export default function AnalyticsPage() {
  const [timeFilter, setTimeFilter] = useState("last_30_days");
  const [, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(defaultMetrics);
  const [businesses] = useState<any[]>([]);
  const [categories] = useState<any[]>([]);
  
  const timeFilters = [
    { key: "last_7_days", label: "Last 7 Days" },
    { key: "last_30_days", label: "Last 30 Days" },
    { key: "last_90_days", label: "Last 90 Days" },
    { key: "this_year", label: "This Year" }
  ];

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getDashboardStats();

      if (response && response.data) {
        const data = response.data;
        // Calculate estimated avgOrderValue from available data
        const estimatedAvgOrderValue = data.total_orders > 0 ? data.total_revenue / data.total_orders : 0;

        setAnalyticsData({
          totalRevenue: data.total_revenue || 0,
          totalCommission: 0, // Not available in API response
          totalUsers: data.total_users || 0,
          activeBusinesses: data.total_businesses || 0,
          totalOrders: data.total_orders || 0,
          avgOrderValue: estimatedAvgOrderValue,
          conversionRate: 0, // Not available in API response
          customerRetentionRate: 0 // Not available in API response
        });

        // Note: top_businesses and category_stats are not available in current API
        // These will remain empty until API is updated
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      // Keep default empty data on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeFilter]);

  const handleRefresh = () => {
    fetchAnalyticsData();
  };

  return (
    <AdminLayout>
      <div className="p-8">
        
        {/* Analytics Header */}
        <Section>
          <SectionHeader 
            title="Analytics & Reports" 
            description="Platform performance insights and business intelligence"
          >
            <div className="flex space-x-3">
              <DropdownButton
                options={timeFilters}
                value={timeFilter}
                onChange={setTimeFilter}
                icon={<Filter className="h-4 w-4 text-gray-500" />}
              />
              <Button variant="filled" size="md">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button 
                onClick={handleRefresh}
                variant="bordered" 
                size="md"
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </SectionHeader>
        </Section>

        {/* Key Performance Metrics */}
        <Section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Revenue"
              value={`₦${(analyticsData.totalRevenue / 1000000).toFixed(1)}M`}              icon={DollarSign}
              iconColor="text-green-500"
            />
            <MetricCard
              title="Platform Commission"
              value={`₦${(analyticsData.totalCommission / 1000000).toFixed(1)}M`}              icon={TrendingUp}
              iconColor="text-blue-500"
            />
            <MetricCard
              title="Total Orders"
              value={analyticsData.totalOrders.toLocaleString()}              icon={ShoppingCart}
              iconColor="text-purple-500"
            />
            <MetricCard
              title="Avg Order Value"
              value={`₦${analyticsData.avgOrderValue.toLocaleString()}`}              icon={Target}
              iconColor="text-orange-500"
            />
          </div>
        </Section>

        {/* Secondary Metrics */}
        <Section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Active Users"
              value={analyticsData.totalUsers.toLocaleString()}              icon={Users}
              iconColor="text-blue-500"
            />
            <MetricCard
              title="Active Businesses"
              value={analyticsData.activeBusinesses.toLocaleString()}              icon={Store}
              iconColor="text-purple-500"
            />
            <MetricCard
              title="Conversion Rate"
              value={`${analyticsData.conversionRate.toFixed(1)}%`}              icon={Zap}
              iconColor="text-yellow-500"
            />
            <MetricCard
              title="Retention Rate"
              value={`${analyticsData.customerRetentionRate.toFixed(1)}%`}              icon={Activity}
              iconColor="text-green-500"
            />
          </div>
        </Section>

        {/* Revenue Trend Chart */}
        <Section>
          <SectionHeader 
            title="Revenue Trend" 
            description="Monthly revenue and order volume over time"
          />
          <Card>
            <CardContent>
              {/* Chart Placeholder */}
              <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-700 mb-2">Revenue Chart</h4>
                  <p className="text-sm text-gray-500 max-w-md">
                    Interactive chart showing monthly revenue trends, order volumes, and growth patterns would be displayed here.
                    Integration with charting library (Chart.js, D3, etc.) required.
                  </p>
                </div>
              </div>
              
              {/* Revenue Metrics using consistent MetricCard */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
                <MetricCard
                  title="This Month"
                  value={`₦${(analyticsData.totalRevenue / 1000000).toFixed(1)}M`}                  icon={DollarSign}
                  iconColor="text-green-500"
                />
                <MetricCard
                  title="Orders"
                  value={analyticsData.totalOrders.toString()}                  icon={ShoppingCart}
                  iconColor="text-blue-500"
                />
                <MetricCard
                  title="Avg Order"
                  value={`₦${analyticsData.avgOrderValue.toLocaleString()}`}                  icon={Target}
                  iconColor="text-purple-500"
                />
                <MetricCard
                  title="Commission"
                  value={`₦${(analyticsData.totalCommission / 1000).toFixed(0)}K`}                  icon={TrendingUp}
                  iconColor="text-orange-500"
                />
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* Analytics Grid */}
        <Section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Top Performing Businesses */}
            <Card padding={false}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Top Performing Businesses</h3>
                    <p className="text-gray-600 text-sm mt-1">Revenue leaders this month</p>
                  </div>
                  <BarChart3 className="h-5 w-5 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {businesses.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Store className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Business Data</h3>
                      <p className="text-gray-500">No business performance data available. When businesses generate revenue, they will appear here.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {businesses.slice(0, 5).map((business, index) => (
                      <div key={business.id} className="px-6 py-4 flex items-center justify-between border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                        <div className="flex items-center">
                          <div className="flex items-center justify-center w-8 h-8 bg-brand text-white rounded-full text-sm font-bold mr-4">
                            {index + 1}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{business.name}</div>
                            <div className="text-xs text-gray-500">{business.category}</div>
                            <div className="text-xs text-gray-400">{business.orders} orders</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">
                            ₦{(business.revenue / 1000000).toFixed(1)}M
                          </div>
                          <div className="text-xs text-gray-500">
                            Commission: ₦{(business.commission / 1000).toFixed(0)}K
                          </div>
                          <div className={`text-xs flex items-center justify-end ${
                            business.growthType === 'increase' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {business.growthType === 'increase' ? (
                              <ArrowUpRight className="h-3 w-3 mr-1" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3 mr-1" />
                            )}
                            {business.growth}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="md">
                  View all businesses →
                </Button>
              </CardFooter>
            </Card>

            {/* Category Performance */}
            <Card padding={false}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Category Performance</h3>
                    <p className="text-gray-600 text-sm mt-1">Revenue breakdown by category</p>
                  </div>
                  <PieChart className="h-5 w-5 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {categories.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <PieChart className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Category Data</h3>
                      <p className="text-gray-500">No category performance data available. When sales are made across categories, they will appear here.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {categories.map((category) => (
                      <div key={category.category} className="px-6 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium text-gray-900">{category.category}</div>
                          <div className="text-sm font-semibold text-gray-900">
                            ₦{(category.revenue / 1000000).toFixed(1)}M
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-4">
                            <span className="text-xs text-gray-500">{category.percentage.toFixed(1)}% of total</span>
                            <span className="text-xs text-green-600">{category.growth}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            ₦{category.avgOrderValue.toLocaleString()} avg
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-brand h-2 rounded-full transition-all duration-300"
                            style={{ width: `${category.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="md">
                  View detailed category analytics →
                </Button>
              </CardFooter>
            </Card>

          </div>
        </Section>

      </div>
    </AdminLayout>
  );
}