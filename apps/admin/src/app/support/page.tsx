"use client";

import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import MetricCard from "@/components/common/MetricCard";
import SectionHeader from "@/components/common/SectionHeader";
import Section from "@/components/common/Section";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/common/Card";
import Button from "@/components/common/Button";
import SearchInput from "@/components/common/SearchInput";
import FilterTabs from "@/components/common/FilterTabs";
import { 
  Headphones, 
  MoreHorizontal, 
  Eye, 
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  Tag,
  Star,
  Phone,
  Mail,
  ArrowRight,
  Plus,
  Filter,
  Download,
  RefreshCcw,
  FileText,
  Users,
  TrendingUp
} from "lucide-react";

// Production: No mock data - only real API data

// Production: No mock data - only real API data

// Production: No mock data - only real API data

export default function SupportPage() {
  const [selectedTab, setSelectedTab] = useState("tickets");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const getTicketStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "escalated":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTicketStatusText = (status: string) => {
    switch (status) {
      case "open":
        return "Open";
      case "in_progress":
        return "In Progress";
      case "resolved":
        return "Resolved";
      case "escalated":
        return "Escalated";
      case "pending":
        return "Pending";
      default:
        return status;
    }
  };

  const getTicketStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "escalated":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "payment":
        return "💳";
      case "technical":
        return "🔧";
      case "order":
        return "📦";
      case "account":
        return "👤";
      case "billing":
        return "💰";
      case "onboarding":
        return "🚀";
      default:
        return "❓";
    }
  };

  // Production: Will use real API data
  const filteredTickets: any[] = [];

  // Production: Will use real API data
  const filteredKnowledgeBase: any[] = [];

  return (
    <AdminLayout>
      <div className="p-8">
        
        {/* Support System Header */}
        <Section>
          <SectionHeader 
            title="Support System" 
            description="Manage customer support tickets and knowledge base"
          >
            <div className="flex space-x-3">
              <Button
                onClick={() => console.log("New ticket")}
                className="mt-0 w-auto px-6 h-11"
                disabled
                title="Not available yet"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
              <Button
                onClick={() => console.log("Export")}
                variant="bordered"
                className="mt-0 w-auto px-6 h-11"
                disabled
                title="Not available yet"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
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

        {/* Support Metrics */}
        <Section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Open Tickets"
              value="0"
              change="0 total"
              changeType="neutral"
              icon={Headphones}
              iconColor="text-blue-500"
            />
            <MetricCard
              title="Resolved Today"
              value="0"
              change="No avg response time"
              changeType="neutral"
              icon={CheckCircle}
              iconColor="text-green-500"
            />
            <MetricCard
              title="Customer Satisfaction"
              value="0/5"
              change="0 escalated"
              changeType="neutral"
              icon={Star}
              iconColor="text-yellow-500"
            />
            <MetricCard
              title="Knowledge Base"
              value="0"
              change="0 views"
              changeType="neutral"
              icon={FileText}
              iconColor="text-purple-500"
            />
          </div>
        </Section>

        {/* Main Support Interface */}
        <Card padding={false}>
          {/* Tab Navigation */}
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div className="flex space-x-2">
                <Button
                  onClick={() => setSelectedTab("tickets")}
                  variant={selectedTab === "tickets" ? "filled" : "bordered"}
                  className="mt-0 w-auto px-4 h-10 text-sm"
                >
                  Support Tickets
                </Button>
                <Button
                  onClick={() => setSelectedTab("knowledge")}
                  variant={selectedTab === "knowledge" ? "filled" : "bordered"}
                  className="mt-0 w-auto px-4 h-10 text-sm"
                >
                  Knowledge Base
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Search and Filters */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
              
              {/* Search */}
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={selectedTab === "tickets" ? "Search tickets by subject, customer, or ID..." : "Search articles by title, category, or content..."}
                className="w-full lg:w-96"
              />

              {/* Filter Tabs - Only show for tickets */}
              {selectedTab === "tickets" && (
                <FilterTabs
                  filters={[
                    { key: "all", label: "All Tickets", count: 0 },
                    { key: "open", label: "Open", count: 0 },
                    { key: "in_progress", label: "In Progress", count: 0 },
                    { key: "escalated", label: "Escalated", count: 0 },
                  ]}
                  selectedFilter={selectedFilter}
                  onFilterChange={setSelectedFilter}
                />
              )}

            </div>
          </div>

          {/* Content based on selected tab */}
          {selectedTab === "tickets" ? (
            /* Support Tickets Table */
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ticket Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority & Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned & Response
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No Support Tickets</h3>
                          <p className="text-gray-500">No support tickets found. When customers submit tickets, they will appear here.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            <div className="text-sm font-medium text-gray-900 mb-1">#{ticket.id}</div>
                            <div className="text-sm font-semibold text-gray-900 mb-2">{ticket.subject}</div>
                            <div className="text-xs text-gray-500 line-clamp-2">{ticket.description}</div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {ticket.tags?.map((tag: any) => (
                                <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-white" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{ticket.customerName}</div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <Mail className="h-3 w-3 mr-1" />
                                {ticket.customerEmail}
                              </div>
                              <div className="text-xs text-gray-400">
                                {ticket.customerType} {ticket.businessName && `• ${ticket.businessName}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(ticket.priority)} mb-2`}>
                              {ticket.priority?.toUpperCase()} PRIORITY
                            </span>
                            <div className="flex items-center">
                              <span className="text-lg mr-2">{getCategoryIcon(ticket.category)}</span>
                              <span className="text-sm text-gray-900 capitalize">{ticket.category}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center mb-2">
                            {getTicketStatusIcon(ticket.status)}
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTicketStatusBadge(ticket.status)}`}>
                              {getTicketStatusText(ticket.status)}
                            </span>
                          </div>
                          {ticket.customerSatisfaction && (
                            <div className="flex items-center">
                              <Star className="h-3 w-3 text-yellow-500 mr-1" />
                              <span className="text-xs text-gray-600">{ticket.customerSatisfaction}/5</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            <div className="text-sm text-gray-900">
                              {ticket.assignedTo || "Unassigned"}
                            </div>
                            {ticket.responseTime && (
                              <div className="text-xs text-green-600">
                                Response: {ticket.responseTime}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            <div>
                              <div>{new Date(ticket.createdDate).toLocaleDateString()}</div>
                              <div className="text-xs text-gray-400">
                                Updated: {new Date(ticket.lastUpdated).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => console.log("View ticket", ticket.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-full border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => console.log("Reply to ticket", ticket.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-full border border-green-200 text-green-600 hover:bg-green-50 transition-colors"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => console.log("More actions", ticket.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Knowledge Base Articles */
            <div className="p-6">
              {filteredKnowledgeBase.length === 0 ? (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center">
                    <FileText className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Knowledge Base Articles</h3>
                    <p className="text-gray-500">No knowledge base articles found. When articles are created, they will appear here.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredKnowledgeBase.map((article) => (
                    <div key={article.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-soft transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {article.category}
                        </span>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Eye className="h-3 w-3" />
                          <span>{article.views}</span>
                        </div>
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{article.title}</h3>
                      <p className="text-sm text-gray-600 mb-4">{article.summary}</p>

                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center text-xs text-gray-500">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          <span>{article.helpful} found helpful</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Updated {new Date(article.lastUpdated).toLocaleDateString()}
                        </div>
                      </div>

                      <Button variant="bordered" size="md" fullWidth>
                        View Article
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Pagination */}
          <CardFooter>
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">1</span> to <span className="font-medium">
                  {selectedTab === "tickets" ? filteredTickets.length : filteredKnowledgeBase.length}
                </span> of{" "}
                <span className="font-medium">
                  {selectedTab === "tickets" ? filteredTickets.length : filteredKnowledgeBase.length}
                </span> results
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="bordered" size="md">
                  Previous
                </Button>
                <Button variant="filled" size="md">
                  1
                </Button>
                <Button variant="bordered" size="md">
                  Next
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>

      </div>
    </AdminLayout>
  );
}