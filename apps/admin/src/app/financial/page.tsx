"use client";

import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import MetricCard from "@/components/common/MetricCard";
import SectionHeader from "@/components/common/SectionHeader";
import Section from "@/components/common/Section";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/common/Card";
import Button from "@/components/common/Button";
import SearchInput from "@/components/common/SearchInput";
import FilterTabs from "@/components/common/FilterTabs";
import { useFinancial } from "@/hooks/api/useApiClient";
import {
  DollarSign,
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  CreditCard,
  Banknote,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  User,
  Calendar,
  Filter,
  Download,
  RefreshCcw,
  Wallet,
  FileText,
  MessageCircle,
  History,
  Loader2,
  Copy
} from "lucide-react";
import { useRouter } from "next/navigation";
import DropdownMenu from "@/components/common/DropdownMenu";
import { toast } from "sonner";

// TypeScript interface for withdrawal request
interface WithdrawalRequest {
  id: string;
  user_id: string;
  wallet_id: string;
  amount: number;
  status: string;
  bank_account_details_id: string;
  reference: string;
  reason?: string;
  created_at: string;
  updated_at: string;
  // Joined data from backend (User → Business nested; bank_account relation)
  user?: {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
    business?: {
      id: string;
      name: string;
      phone: string;
    };
  };
  bank_account?: {
    bank: string;
    account_number: string;
    account_name: string;
  };
}

export default function FinancialPage() {
  const [selectedTab, setSelectedTab] = useState("withdrawals");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const router = useRouter();

  const { getWithdrawals, approveWithdrawal, rejectWithdrawal } = useFinancial();

  // Fetch withdrawals data
  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const statusFilter = selectedFilter === "all" ? "" : selectedFilter;
      const response = await getWithdrawals(page, 20, statusFilter);
      // Backend envelope: { data: { data: [] }, page, total, totalPages }.
      // Array lives at data.data; pagination is top-level (matches businesses/products).
      const withdrawalData = response?.data?.data || [];
      setWithdrawals(Array.isArray(withdrawalData) ? withdrawalData : []);
      setTotalCount((response as any)?.total || withdrawalData.length || 0);
      setTotalPages((response as any)?.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch withdrawals:", error);
      toast.error("Failed to load withdrawal requests");
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  }, [getWithdrawals, page, selectedFilter]);

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  // Copy to clipboard helper
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const getWithdrawalStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
      case "under_review":
        return "bg-blue-100 text-blue-800";
      case "rejected":
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getWithdrawalStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "approved":
        return "Approved";
      case "pending":
        return "Pending";
      case "processing":
        return "Processing";
      case "under_review":
        return "Under Review";
      case "rejected":
        return "Rejected";
      case "failed":
        return "Failed";
      default:
        return status;
    }
  };

  const getWithdrawalStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "processing":
      case "under_review":
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      case "rejected":
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case "order_payment":
        return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case "refund":
        return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      case "withdrawal_fee":
        return <Wallet className="h-4 w-4 text-blue-500" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTransactionTypeBadge = (type: string) => {
    switch (type) {
      case "order_payment":
        return "bg-green-100 text-green-800";
      case "refund":
        return "bg-red-100 text-red-800";
      case "withdrawal_fee":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Filter withdrawals based on search term
  const filteredWithdrawals = withdrawals.filter((withdrawal) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      withdrawal.id?.toLowerCase().includes(search) ||
      withdrawal.reference?.toLowerCase().includes(search) ||
      withdrawal.user?.business?.name?.toLowerCase().includes(search) ||
      withdrawal.user?.firstname?.toLowerCase().includes(search) ||
      withdrawal.user?.lastname?.toLowerCase().includes(search) ||
      withdrawal.bank_account?.account_name?.toLowerCase().includes(search)
    );
  });

  // Calculate counts for filter tabs
  const statusCounts = {
    all: withdrawals.length,
    pending: withdrawals.filter(w => w.status === "pending").length,
    processing: withdrawals.filter(w => w.status === "processing").length,
    completed: withdrawals.filter(w => w.status === "completed" || w.status === "approved").length,
  };

  // Action handlers
  const handleApproveWithdrawal = async (withdrawal: WithdrawalRequest) => {
    if (actionLoading) return;

    const confirmApprove = window.confirm(
      `Are you sure you want to approve this withdrawal?\n\nAmount: ₦${withdrawal.amount.toLocaleString()}\nVendor: ${withdrawal.user?.business?.name || "Unknown"}\nBank: ${withdrawal.bank_account?.bank || "Unknown"}\nAccount: ${withdrawal.bank_account?.account_number || "Unknown"}`
    );

    if (!confirmApprove) return;

    setActionLoading(withdrawal.id);
    try {
      await approveWithdrawal(withdrawal.id);
      toast.success(`Withdrawal approved! Please transfer ₦${withdrawal.amount.toLocaleString()} to ${withdrawal.bank_account?.account_name || "vendor"}`);
      fetchWithdrawals(); // Refresh data
    } catch (error: any) {
      console.error("Failed to approve withdrawal:", error);
      toast.error(error?.message || "Failed to approve withdrawal");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectWithdrawal = async (withdrawal: WithdrawalRequest) => {
    if (actionLoading) return;

    const reason = prompt("Please provide a reason for rejection:");
    if (!reason) return;

    setActionLoading(withdrawal.id);
    try {
      await rejectWithdrawal(withdrawal.id, reason);
      toast.success(`Withdrawal rejected`);
      fetchWithdrawals(); // Refresh data
    } catch (error: any) {
      console.error("Failed to reject withdrawal:", error);
      toast.error(error?.message || "Failed to reject withdrawal");
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewTransactionHistory = (businessId: string) => {
    router.push(`/financial/transactions?businessId=${businessId}`);
  };

  const handleContactBusinessOwner = (withdrawal: WithdrawalRequest) => {
    const phone = withdrawal.user?.business?.phone || withdrawal.user?.phone;
    if (phone) {
      copyToClipboard(phone, "Phone number");
    } else {
      toast.info("No phone number available");
    }
  };

  const handleCopyBankDetails = (withdrawal: WithdrawalRequest) => {
    const bankDetails = `Bank: ${withdrawal.bank_account?.bank || "N/A"}\nAccount: ${withdrawal.bank_account?.account_number || "N/A"}\nName: ${withdrawal.bank_account?.account_name || "N/A"}\nAmount: ₦${withdrawal.amount.toLocaleString()}`;
    copyToClipboard(bankDetails, "Bank details");
  };

  const handleRowClick = (withdrawalId: string) => {
    // Could open side panel in future
    console.log("Open withdrawal detail panel:", withdrawalId);
  };

  // Production: Will use real API data for transactions
  const filteredTransactions: any[] = [];

  return (
    <AdminLayout>
      <div className="p-8">

        {/* Financial Operations Header */}
        <Section>
          <SectionHeader
            title="Financial Operations"
            description="Manage withdrawals, transactions, and financial activities"
          >
            <div className="flex space-x-3">
              <Button
                onClick={() => console.log("Export financial report")}
                className="mt-0 w-auto px-6 h-11"
                disabled
                title="Not available yet"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Financial Report
              </Button>
              <Button
                onClick={() => fetchWithdrawals()}
                variant="bordered"
                className="mt-0 w-auto px-6 h-11"
                loading={loading}
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </SectionHeader>
        </Section>

        {/* Financial Metrics */}
        <Section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Platform Revenue"
              value="₦0.0M"
              icon={DollarSign}
              iconColor="text-green-500"
            />
            <MetricCard
              title="Platform Commission"
              value="₦0.0M"
              icon={TrendingUp}
              iconColor="text-blue-500"
            />
            <MetricCard
              title="Pending Withdrawals"
              value={`₦${(withdrawals.filter(w => w.status === "pending").reduce((sum, w) => sum + w.amount, 0) / 1000000).toFixed(1)}M`}
              change={`${statusCounts.pending} requests`}
              changeType="neutral"
              icon={Clock}
              iconColor="text-yellow-500"
            />
            <MetricCard
              title="Total Withdrawals"
              value={`${totalCount}`}
              change={`₦${(withdrawals.reduce((sum, w) => sum + w.amount, 0) / 1000).toFixed(0)}K total`}
              changeType="neutral"
              icon={Banknote}
              iconColor="text-purple-500"
            />
          </div>
        </Section>

        {/* Main Financial Operations */}
        <Card padding={false}>
          {/* Tab Navigation */}
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div className="flex space-x-2">
                <Button
                  onClick={() => setSelectedTab("withdrawals")}
                  variant={selectedTab === "withdrawals" ? "filled" : "bordered"}
                  className="mt-0 w-auto px-4 h-10 text-sm"
                >
                  Withdrawal Requests
                </Button>
                <Button
                  onClick={() => setSelectedTab("transactions")}
                  variant={selectedTab === "transactions" ? "filled" : "bordered"}
                  className="mt-0 w-auto px-4 h-10 text-sm"
                >
                  Transaction Monitor
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
                placeholder={selectedTab === "withdrawals" ? "Search withdrawals by business, owner, or ID..." : "Search transactions by business, customer, or ID..."}
                className="w-full lg:w-96"
              />

              {/* Filter Tabs - Only show for withdrawals */}
              {selectedTab === "withdrawals" && (
                <FilterTabs
                  filters={[
                    { key: "all", label: "All Requests", count: statusCounts.all },
                    { key: "pending", label: "Pending", count: statusCounts.pending },
                    { key: "processing", label: "Processing", count: statusCounts.processing },
                    { key: "completed", label: "Completed", count: statusCounts.completed },
                  ]}
                  selectedFilter={selectedFilter}
                  onFilterChange={setSelectedFilter}
                />
              )}

            </div>
          </div>

          {/* Content based on selected tab */}
          {selectedTab === "withdrawals" ? (
            /* Withdrawals Table */
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  <span className="ml-3 text-gray-600">Loading withdrawals...</span>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Withdrawal Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Business
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bank Information
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
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
                    {filteredWithdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center">
                            <Wallet className="h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Withdrawal Requests</h3>
                            <p className="text-gray-500">No withdrawal requests found. When businesses request withdrawals, they will appear here.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredWithdrawals.map((withdrawal) => (
                        <tr
                          key={withdrawal.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleRowClick(withdrawal.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">#{withdrawal.reference || withdrawal.id?.slice(0, 8)}</div>
                              <div className="text-sm text-green-600 font-semibold">
                                ₦{withdrawal.amount?.toLocaleString() || "0"}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 bg-purple-500 rounded-full flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-white" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{withdrawal.user?.business?.name || "Unknown Business"}</div>
                                <div className="text-sm text-gray-500 flex items-center">
                                  <User className="h-3 w-3 mr-1" />
                                  {withdrawal.user?.firstname} {withdrawal.user?.lastname}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{withdrawal.bank_account?.bank || "N/A"}</div>
                              <div className="text-sm text-gray-500 font-mono flex items-center">
                                {withdrawal.bank_account?.account_number || "N/A"}
                                <button
                                  onClick={() => copyToClipboard(withdrawal.bank_account?.account_number || "", "Account number")}
                                  className="ml-2 p-1 hover:bg-gray-100 rounded"
                                  title="Copy account number"
                                >
                                  <Copy className="h-3 w-3 text-gray-400" />
                                </button>
                              </div>
                              <div className="text-xs text-gray-400">{withdrawal.bank_account?.account_name || "N/A"}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-semibold text-gray-900">
                                ₦{withdrawal.amount?.toLocaleString() || "0"}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center mb-2">
                              {getWithdrawalStatusIcon(withdrawal.status)}
                              <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getWithdrawalStatusBadge(withdrawal.status)}`}>
                                {getWithdrawalStatusText(withdrawal.status)}
                              </span>
                            </div>
                            {withdrawal.reason && (
                              <div className="text-xs text-red-600">
                                {withdrawal.reason}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              <div>
                                <div>{withdrawal.created_at ? new Date(withdrawal.created_at).toLocaleDateString() : "N/A"}</div>
                                <div className="text-xs text-gray-400">
                                  {withdrawal.created_at ? new Date(withdrawal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center space-x-2 justify-end">
                              {/* Primary Action: Approve (only for pending) */}
                              <button
                                onClick={() => handleApproveWithdrawal(withdrawal)}
                                className={`w-8 h-8 flex items-center justify-center rounded-full border transition-colors ${
                                  withdrawal.status === 'pending' && !actionLoading
                                    ? 'border-green-200 text-green-600 hover:bg-green-50'
                                    : 'border-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                                title="Approve Withdrawal"
                                disabled={withdrawal.status !== 'pending' || !!actionLoading}
                              >
                                {actionLoading === withdrawal.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                              </button>

                              {/* Secondary Action: Reject (only for pending) */}
                              <button
                                onClick={() => handleRejectWithdrawal(withdrawal)}
                                className={`w-8 h-8 flex items-center justify-center rounded-full border transition-colors ${
                                  withdrawal.status === 'pending' && !actionLoading
                                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                                    : 'border-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                                title="Reject Withdrawal"
                                disabled={withdrawal.status !== 'pending' || !!actionLoading}
                              >
                                <XCircle className="h-4 w-4" />
                              </button>

                              {/* More Actions Menu */}
                              <DropdownMenu
                                items={[
                                  {
                                    label: 'Copy Bank Details',
                                    icon: <Copy className="h-4 w-4" />,
                                    onClick: () => handleCopyBankDetails(withdrawal)
                                  },
                                  {
                                    label: 'View Transaction History',
                                    icon: <History className="h-4 w-4" />,
                                    onClick: () => handleViewTransactionHistory(withdrawal.user?.business?.id || "")
                                  },
                                  {
                                    label: 'Contact Business Owner',
                                    icon: <MessageCircle className="h-4 w-4" />,
                                    onClick: () => handleContactBusinessOwner(withdrawal)
                                  },
                                ]}
                              />
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            /* Transactions Table */
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Parties
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount Breakdown
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Method
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
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <CreditCard className="h-12 w-12 text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions</h3>
                          <p className="text-gray-500">No transactions found. When payments are processed, they will appear here.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">#{transaction.id}</div>
                            {transaction.orderId && (
                              <div className="text-sm text-blue-600">Order: {transaction.orderId}</div>
                            )}
                            <div className={`text-sm font-semibold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.amount >= 0 ? '+' : ''}₦{Math.abs(transaction.amount).toLocaleString()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getTransactionTypeIcon(transaction.type)}
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTransactionTypeBadge(transaction.type)}`}>
                              {transaction.type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{transaction.businessName}</div>
                            {transaction.customerName && (
                              <div className="text-sm text-gray-500 flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                {transaction.customerName}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              Total: ₦{Math.abs(transaction.amount).toLocaleString()}
                            </div>
                            <div className="text-sm text-blue-600">
                              Commission: ₦{Math.abs(transaction.commission).toLocaleString()}
                            </div>
                            <div className="text-sm text-green-600">
                              Net: ₦{Math.abs(transaction.netAmount).toLocaleString()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">{transaction.paymentMethod}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            <div>
                              <div>{new Date(transaction.date).toLocaleDateString()}</div>
                              <div className="text-xs text-gray-400">
                                {new Date(transaction.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => console.log("View transaction", transaction.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-full border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => console.log("More actions", transaction.id)}
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
          )}

          {/* Pagination */}
          <CardFooter>
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">1</span> to <span className="font-medium">
                  {selectedTab === "withdrawals" ? filteredWithdrawals.length : filteredTransactions.length}
                </span> of{" "}
                <span className="font-medium">
                  {selectedTab === "withdrawals" ? totalCount : filteredTransactions.length}
                </span> results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="bordered"
                  size="md"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button variant="filled" size="md">
                  {page}
                </Button>
                <Button
                  variant="bordered"
                  size="md"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
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
