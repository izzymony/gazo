"use client";

import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import SectionHeader from "@/components/common/SectionHeader";
import Section from "@/components/common/Section";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/common/Card";
import MetricCard from "@/components/common/MetricCard";
import Button from "@/components/common/Button";
import SearchInput from "@/components/common/SearchInput";
import FilterTabs from "@/components/common/FilterTabs";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  MoreHorizontal,
  MessageSquare,
  Eye,
  Ban,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  Search
} from "lucide-react";

const disputeStatuses = [
  { label: "All Disputes", value: "all" },
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
  { label: "Escalated", value: "escalated" }
];

// Production: No mock data - only real API data
const disputes: any[] = [];

export default function OrderDisputesPage() {
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-100 text-red-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "escalated":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <SectionHeader 
          title="Order Disputes" 
          description="Manage customer disputes and resolution process"
        />

        {/* Metrics */}
        <Section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Disputes"
              value="0"              icon={AlertTriangle}
              iconColor="text-red-600"
            />
            <MetricCard
              title="Open Disputes"
              value="0"              icon={Clock}
              iconColor="text-yellow-600"
            />
            <MetricCard
              title="Resolved This Month"
              value="0"              icon={CheckCircle}
              iconColor="text-green-600"
            />
            <MetricCard
              title="Avg Resolution Time"
              value="0 days"              icon={XCircle}
              iconColor="text-blue-600"
            />
          </div>
        </Section>

        {/* Disputes Management */}
        <Section>
          <Card>
            <CardHeader>
              <SectionHeader 
                title="Dispute Management" 
                description="Monitor and resolve customer disputes"
              >
                <div className="flex items-center space-x-3">
                  <Button variant="bordered" size="md">
                    <FileText className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button variant="filled" size="md">
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Review
                  </Button>
                </div>
              </SectionHeader>
            </CardHeader>

            <CardContent>
              {/* Filters and Search */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search disputes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                    />
                  </div>
                  
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  >
                    {disputeStatuses.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Button variant="ghost" size="md">
                  <Filter className="mr-2 h-4 w-4" />
                  More Filters
                </Button>
              </div>

              {/* Disputes Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button className="flex items-center space-x-1 hover:text-gray-700">
                          <span>Dispute</span>
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer & Vendor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button className="flex items-center space-x-1 hover:text-gray-700">
                          <span>Amount</span>
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status & Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Activity
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {disputes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center">
                            <AlertTriangle className="h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Disputes</h3>
                            <p className="text-gray-500">No disputes found. When customers raise disputes, they will appear here.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      disputes.map((dispute) => (
                        <tr key={dispute.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {dispute.id}
                              </div>
                              <div className="text-sm text-gray-500">
                                Order: {dispute.orderId}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                {dispute.reason}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {dispute.customer}
                              </div>
                              <div className="text-sm text-gray-500">
                                vs {dispute.vendor}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {dispute.amount}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(dispute.status)}`}>
                                {dispute.status.replace('_', ' ')}
                              </span>
                              <div>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(dispute.priority)}`}>
                                  {dispute.priority}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              <div className="flex items-center space-x-1">
                                <MessageSquare className="h-4 w-4 text-gray-400" />
                                <span>{dispute.messages} messages</span>
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                {new Date(dispute.lastActivity).toLocaleDateString()}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <button className="text-brand hover:text-brandDark">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button className="text-gray-400 hover:text-gray-600">
                              <MessageSquare className="h-4 w-4" />
                            </button>
                            <button className="text-gray-400 hover:text-gray-600">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>

            <CardFooter>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">0</span> to <span className="font-medium">0</span> of{" "}
                  <span className="font-medium">0</span> disputes
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-3 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <button
                    className="relative inline-flex items-center px-3 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardFooter>
          </Card>
        </Section>
      </div>
    </AdminLayout>
  );
}