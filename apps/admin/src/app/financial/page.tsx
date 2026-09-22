"use client";

import {
  AWAITING_APPROVAL,
  IN_FLIGHT,
  NEEDS_ATTENTION,
  PAID,
  WITHDRAWAL_FILTERS,
  amountFor,
  countFor,
  isAwaitingApproval,
  parseCounts,
  totalAmount as tallyAmount,
  totalCount as tallyCount,
  type StatusTally,
} from '@/lib/withdrawalStatus';

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

/**
 * The withdrawal lifecycle, as the backend now reports it.
 *
 * Approval used to mean "an admin pressed a button and then made a bank
 * transfer by hand", and this page said so — it told the admin to go and send
 * the money. Approval now AUTHORISES a Paystack transfer, and a withdrawal
 * becomes `paid` only when Paystack confirms it. Anyone transferring manually
 * on top of that pays the seller twice.
 *
 * `pending`, `approved` and `completed` are the old vocabulary. `pending` was
 * migrated to `requested`, and `completed` was deliberately NOT migrated —
 * those rows record an approval whose payment nobody ever verified, so they are
 * left distinguishable for reconciliation rather than relabelled `paid`. All
 * three are still mapped here so historical rows render.
 */
const WITHDRAWAL_STATUS: Record<string, { label: string; badge: string; tone: "waiting" | "inFlight" | "done" | "bad" | "neutral" }> = {
  requested:    { label: "Awaiting Approval", badge: "bg-yellow-100 text-yellow-800", tone: "waiting" },
  processing:   { label: "Sending",           badge: "bg-blue-100 text-blue-800",     tone: "inFlight" },
  awaiting_otp: { label: "Awaiting OTP",      badge: "bg-blue-100 text-blue-800",     tone: "inFlight" },
  paid:         { label: "Paid",              badge: "bg-green-100 text-green-800",   tone: "done" },
  failed:       { label: "Failed",            badge: "bg-red-100 text-red-800",       tone: "bad" },
  blocked:      { label: "Blocked",           badge: "bg-red-100 text-red-800",       tone: "bad" },
  reversed:     { label: "Returned by bank",  badge: "bg-red-100 text-red-800",       tone: "bad" },
  rejected:     { label: "Rejected",          badge: "bg-red-100 text-red-800",       tone: "bad" },
  needs_review: { label: "Needs Review",      badge: "bg-orange-100 text-orange-800", tone: "bad" },

  // Legacy.
  pending:      { label: "Awaiting Approval", badge: "bg-yellow-100 text-yellow-800", tone: "waiting" },
  approved:     { label: "Approved (legacy)", badge: "bg-gray-100 text-gray-800",     tone: "neutral" },
  completed:    { label: "Paid (unverified)", badge: "bg-gray-100 text-gray-800",     tone: "neutral" },
  under_review: { label: "Under Review",      badge: "bg-blue-100 text-blue-800",     tone: "inFlight" },
};

/**
 * `pending` is accepted alongside `requested` so the page keeps working against
 * a backend whose migration has not run yet. Gating the approve button on one
 * spelling is how it would silently become impossible to approve anything.
 */
// Status groups, counting and filter-key construction all live in one module,
// so a tab cannot count one set of statuses and fetch another.


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
  // Whole-table tallies from the API, so badges and money totals stay correct
  // on page 3 of a filtered list.
  const [statusTally, setStatusTally] = useState<StatusTally>({});
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

      // `counts` is a GROUP BY over every withdrawal, independent of this
      // request's filter and page. Absent on an older backend, in which case
      // the badges show nothing rather than something wrong.
      const parsed = parseCounts(response?.counts);
      if (parsed) setStatusTally(parsed);
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

  const getWithdrawalStatusBadge = (status: string) =>
    WITHDRAWAL_STATUS[status]?.badge ?? "bg-gray-100 text-gray-800";

  const getWithdrawalStatusText = (status: string) =>
    WITHDRAWAL_STATUS[status]?.label ?? status;

  const getWithdrawalStatusIcon = (status: string) => {
    const tone = WITHDRAWAL_STATUS[status]?.tone ?? "neutral";
    switch (tone) {
      case "done":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "waiting":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "inFlight":
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      case "bad":
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
  // Counts come from the server's GROUP BY over the whole table, never from
  // the page in hand. Counting `withdrawals` was wrong twice over: it only saw
  // the 20 rows just fetched, and with any filter active the other tabs
  // counted rows that were no longer in the response, so they all read 0.
  const statusCounts = {
    all: tallyCount(statusTally),
    requested: countFor(statusTally, AWAITING_APPROVAL),
    processing: countFor(statusTally, IN_FLIGHT),
    paid: countFor(statusTally, PAID),
    attention: countFor(statusTally, NEEDS_ATTENTION),
  };

  // Action handlers
  const handleApproveWithdrawal = async (withdrawal: WithdrawalRequest) => {
    if (actionLoading) return;

    const confirmApprove = window.confirm(
      `Approve this withdrawal and send the transfer?\n\n` +
      `Amount: ₦${withdrawal.amount.toLocaleString()}\n` +
      `Vendor: ${withdrawal.user?.business?.name || "Unknown"}\n` +
      `Bank: ${withdrawal.bank_account?.bank || "Unknown"}\n` +
      `Account: ${withdrawal.bank_account?.account_number || "Unknown"}\n\n` +
      `Paystack sends this automatically. Do NOT also transfer it manually.`
    );

    if (!confirmApprove) return;

    setActionLoading(withdrawal.id);
    try {
      await approveWithdrawal(withdrawal.id);
      // This used to read "Please transfer ₦X to vendor" — an instruction to
      // make the payment by hand, which was correct when nothing else did.
      // It is now the instruction that pays a seller twice.
      toast.success(`Transfer sent to Paystack. It will show as Paid once Paystack confirms — no manual transfer needed.`);
      fetchWithdrawals(); // Refresh data
    } catch (error: any) {
      console.error("Failed to approve withdrawal:", error);
      // 503 means the platform cannot pay right now and NOTHING happened to
      // this withdrawal — distinct from a rejected request, and the admin needs
      // to know it is safe to try again later rather than chase the seller.
      if (error?.status === 503 || error?.reason === "payouts_disabled") {
        toast.error("Payouts are switched off, so nothing was approved. Try again once they are enabled.");
      } else {
        toast.error(error?.message || "Failed to approve withdrawal");
      }
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
              title="Awaiting Approval"
              value={`₦${(amountFor(statusTally, AWAITING_APPROVAL) / 1000000).toFixed(1)}M`}
              change={`${statusCounts.requested} requests`}
              changeType="neutral"
              icon={Clock}
              iconColor="text-yellow-500"
            />
            <MetricCard
              title="Total Withdrawals"
              value={`${statusCounts.all}`}
              change={`₦${(tallyAmount(statusTally) / 1000).toFixed(0)}K total`}
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
                    // Each key IS the status set its badge counts — one array
                    // builds both, so they cannot drift apart.
                    ...WITHDRAWAL_FILTERS.map((f) => ({
                      key: f.key,
                      label: f.label,
                      count: f.statuses.length === 0
                        ? statusCounts.all
                        : countFor(statusTally, f.statuses),
                    })),
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
                                  isAwaitingApproval(withdrawal.status) && !actionLoading
                                    ? 'border-green-200 text-green-600 hover:bg-green-50'
                                    : 'border-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                                title="Approve withdrawal and send the transfer"
                                disabled={!isAwaitingApproval(withdrawal.status) || !!actionLoading}
                              >
                                {actionLoading === withdrawal.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                              </button>

                              {/* Secondary Action: Reject — same gate as Approve.
                                  This was still on the literal 'pending', which
                                  migration 015 renamed to 'requested', so reject
                                  was permanently disabled for every real
                                  withdrawal while the backend accepted it. */}
                              <button
                                onClick={() => handleRejectWithdrawal(withdrawal)}
                                className={`w-8 h-8 flex items-center justify-center rounded-full border transition-colors ${
                                  isAwaitingApproval(withdrawal.status) && !actionLoading
                                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                                    : 'border-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                                title="Reject withdrawal and return the funds to the seller's balance"
                                disabled={!isAwaitingApproval(withdrawal.status) || !!actionLoading}
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
