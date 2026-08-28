"use client";

import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import MetricCard from "@/components/common/MetricCard";
import SectionHeader from "@/components/common/SectionHeader";
import Section from "@/components/common/Section";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/common/Card";
import Button from "@/components/common/Button";
import { 
  BarChart3, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  Filter,
  RefreshCcw,
  PieChart,
  LineChart,
  Users,
  Store,
  ShoppingCart,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  MoreHorizontal
} from "lucide-react";

// Real data not yet wired — honest empty state instead of fabricated figures.
const monthlyRevenue: any[] = [];

const categoryRevenue: any[] = [];

// Production: No mock data - only real API data
const topBusinessesRevenue: any[] = [];

// Production: No mock data - only real API data
const revenueSummary = {
  totalRevenue: 0,
  totalCommission: 0,
  totalOrders: 0,
  activeBusinesses: 0,
  avgOrderValue: 0,
  commissionRate: 0,
  monthlyGrowth: 0,
  yearlyGrowth: 0
};

export default function RevenueReportsPage() {
  const [timeFilter, setTimeFilter] = useState("monthly");
  const [reportType, setReportType] = useState("overview");
  
  const timeFilters = [
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
    { key: "quarterly", label: "Quarterly" },
    { key: "yearly", label: "Yearly" }
  ];

  const reportTypes = [
    { key: "overview", label: "Revenue Overview" },
    { key: "categories", label: "Category Breakdown" },
    { key: "businesses", label: "Business Performance" },
    { key: "trends", label: "Growth Trends" }
  ];

  return (
    <AdminLayout>
      <div className="p-8">
        
        {/* Revenue Reports Header */}
        <Section>
          <SectionHeader 
            title="Revenue Reports" 
            description="Comprehensive revenue analytics and financial performance insights"
          >
            <div className="flex space-x-3">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select 
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black bg-white"
                >
                  {timeFilters.map((filter) => (
                    <option key={filter.key} value={filter.key}>
                      {filter.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-gray-500" />
                <select 
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black bg-white"
                >
                  {reportTypes.map((type) => (
                    <option key={type.key} value={type.key}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={() => console.log("Export report")}
                className="mt-0 w-auto px-6 h-11"
                disabled
                title="Not available yet"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button
                onClick={() => console.log("Refresh")}
                variant="bordered"
                className="mt-0 w-auto px-6 h-11"
                disabled
                title="Not available yet"
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </SectionHeader>
        </Section>

        {/* Key Revenue Metrics */}
        <Section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Revenue"
              value={`₦${(revenueSummary.totalRevenue / 1000000).toFixed(1)}M`}
              change={`+${revenueSummary.yearlyGrowth}%`}
              changeType="increase"
              icon={DollarSign}
              iconColor="text-green-500"
            />
            <MetricCard
              title="Platform Commission"
              value={`₦${(revenueSummary.totalCommission / 1000000).toFixed(1)}M`}
              change={`${revenueSummary.commissionRate}% avg rate`}
              changeType="neutral"
              icon={TrendingUp}
              iconColor="text-blue-500"
            />
            <MetricCard
              title="Average Order Value"
              value={`₦${revenueSummary.avgOrderValue.toLocaleString()}`}
              change={`+${revenueSummary.monthlyGrowth}%`}
              changeType="increase"
              icon={Target}
              iconColor="text-purple-500"
            />
            <MetricCard
              title="Active Revenue Sources"
              value={revenueSummary.activeBusinesses.toString()}
              change={`${revenueSummary.totalOrders.toLocaleString()} orders`}
              changeType="neutral"
              icon={Store}
              iconColor="text-orange-500"
            />
          </div>
        </Section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Monthly Revenue Trend */}
          <Card padding={false}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Monthly Revenue Trend</h3>
                  <p className="text-gray-600 text-sm mt-1">Revenue and commission over time</p>
                </div>
                <LineChart className="h-5 w-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-0">
                {monthlyRevenue.slice(-6).map((month, index) => (
                  <div key={month.month} className="px-6 py-4 flex items-center justify-between border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">{month.month}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        ₦{(month.revenue / 1000000).toFixed(1)}M
                      </div>
                      <div className="text-xs text-blue-600">
                        Commission: ₦{(month.commission / 1000).toFixed(0)}K
                      </div>
                      <div className={`text-xs flex items-center justify-end ${
                        month.growth.startsWith('+') ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {month.growth.startsWith('+') ? (
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                        )}
                        {month.growth}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <button className="text-brand text-sm font-medium hover:text-brandDark transition-colors">
                View detailed revenue trends →
              </button>
            </CardFooter>
          </Card>

          {/* Category Revenue Breakdown */}
          <Card padding={false}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Revenue by Category</h3>
                  <p className="text-gray-600 text-sm mt-1">Category contribution to total revenue</p>
                </div>
                <PieChart className="h-5 w-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-0">
                {categoryRevenue.map((category, index) => (
                  <div key={category.category} className="px-6 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-900">{category.category}</div>
                      <div className="text-sm font-semibold text-gray-900">
                        ₦{(category.revenue / 1000000).toFixed(1)}M
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-4">
                        <span className="text-xs text-gray-500">{category.percentage}% of total</span>
                        <span className="text-xs text-green-600">{category.growth}</span>
                      </div>
                      <div className="text-xs text-blue-600">
                        Commission: ₦{(category.commission / 1000).toFixed(0)}K
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
            </CardContent>
            <CardFooter>
              <button className="text-brand text-sm font-medium hover:text-brandDark transition-colors">
                View category analysis →
              </button>
            </CardFooter>
          </Card>

        </div>

        {/* Top Revenue Generating Businesses */}
        <Card padding={false}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Top Revenue Generating Businesses</h3>
                <p className="text-gray-600 text-sm mt-1">Businesses ranked by revenue contribution</p>
              </div>
              <div className="flex items-center space-x-2">
                <button className="text-gray-600 hover:text-gray-900">
                  <Eye className="h-4 w-4" />
                </button>
                <button className="text-gray-600 hover:text-gray-900">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank & Business
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commission Earned
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Orders
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Growth
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topBusinessesRevenue.map((business, index) => (
                    <tr key={business.name} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex items-center justify-center w-8 h-8 bg-brand text-white rounded-full text-sm font-bold mr-4">
                            {index + 1}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{business.name}</div>
                            <div className="text-xs text-gray-500">{business.orders} orders</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {business.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          ₦{(business.revenue / 1000000).toFixed(1)}M
                        </div>
                        <div className="text-xs text-gray-500">
                          ₦{Math.round(business.revenue / business.orders).toLocaleString()} per order
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-green-600">
                          ₦{(business.commission / 1000).toFixed(0)}K
                        </div>
                        <div className="text-xs text-gray-500">
                          {((business.commission / business.revenue) * 100).toFixed(1)}% rate
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{business.orders}</div>
                        <div className="text-xs text-gray-500">
                          ₦{Math.round(business.revenue / business.orders).toLocaleString()} avg
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm flex items-center ${
                          business.growth.startsWith('+') ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {business.growth.startsWith('+') ? (
                            <ArrowUpRight className="h-4 w-4 mr-1" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 mr-1" />
                          )}
                          {business.growth}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
          <CardFooter>
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-gray-700">
                Showing top <span className="font-medium">{topBusinessesRevenue.length}</span> revenue generating businesses
              </div>
              <button className="text-brand text-sm font-medium hover:text-brandDark transition-colors">
                View all business revenue reports →
              </button>
            </div>
          </CardFooter>
        </Card>

      </div>
    </AdminLayout>
  );
}