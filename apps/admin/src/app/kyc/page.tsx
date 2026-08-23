"use client";

import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import SectionHeader from "@/components/common/SectionHeader";
import { Card, CardFooter } from "@/components/common/Card";
import Button from "@/components/common/Button";
import SearchInput from "@/components/common/SearchInput";
import FilterTabs from "@/components/common/FilterTabs";
import SidePanel from "@/components/common/SidePanel";
import KycDetailView, { KYCSubmission } from "@/components/detail-views/KycDetailView";
import { useKYC } from "@/hooks/api/useApiClient";
import { CheckCircle, XCircle, Eye, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const FILTERS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${
        map[status] || "bg-gray-100 text-gray-700"
      }`}>
      {status}
    </span>
  );
}

export default function KYCPage() {
  const [selectedFilter, setSelectedFilter] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [submissions, setSubmissions] = useState<KYCSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selected, setSelected] = useState<KYCSubmission | null>(null);

  const { getKYCSubmissions, reviewKYC } = useKYC();

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const status = selectedFilter === "all" ? "" : selectedFilter;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response: any = await getKYCSubmissions(page, 20, status);
      const list = response?.data?.kyc_submissions || [];
      const pagination = response?.data?.pagination;
      setSubmissions(Array.isArray(list) ? list : []);
      setTotalCount(pagination?.total_count || list.length || 0);
      setTotalPages(pagination?.total_pages || 1);
    } catch (error) {
      console.error("Failed to fetch KYC submissions:", error);
      toast.error("Failed to load KYC submissions");
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [getKYCSubmissions, page, selectedFilter]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const doReview = async (sub: KYCSubmission, status: "approved" | "rejected") => {
    if (actionLoading) return;
    let reason: string | undefined;
    if (status === "rejected") {
      const r = window.prompt("Reason for rejection (shown to the seller):");
      if (!r) return;
      reason = r;
    } else if (
      !window.confirm(
        `Approve ${sub.legal_name || "this seller"}?\n\nThis grants their Verified badge and lifts their ₦100k withdrawal gate.`
      )
    ) {
      return;
    }
    setActionLoading(sub.id);
    try {
      await reviewKYC(sub.id, status, reason);
      toast.success(status === "approved" ? "Seller verified" : "Submission rejected");
      setSelected(null);
      fetchSubmissions();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to review submission";
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = submissions.filter((s) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      s.legal_name?.toLowerCase().includes(q) ||
      s.user?.email?.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <SectionHeader
          title="KYC / Verification"
          description="Review seller identity submissions — approve to grant the Verified badge and lift the withdrawal gate."
        />

        <Card padding={false}>
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search by name, email, or ID..."
                className="w-full lg:w-96"
              />
              <FilterTabs
                filters={FILTERS}
                selectedFilter={selectedFilter}
                onFilterChange={(f) => {
                  setSelectedFilter(f);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-3 text-gray-600">Loading submissions...</span>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <ShieldCheck className="h-12 w-12 text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions</h3>
                          <p className="text-gray-500">No KYC submissions in this view yet.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((sub) => (
                      <tr
                        key={sub.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelected(sub)}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{sub.legal_name || "—"}</div>
                          <div className="text-sm text-gray-500">{sub.user?.email || sub.user_id?.slice(0, 8)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 capitalize">
                          {sub.document_type?.replace(/_/g, " ") || "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sub.created_at ? new Date(sub.created_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{statusBadge(sub.status)}</td>
                        <td
                          className="px-6 py-4 whitespace-nowrap text-right"
                          onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelected(sub)}
                              className="p-2 text-gray-500 hover:text-gray-700"
                              title="View">
                              <Eye className="h-4 w-4" />
                            </button>
                            {sub.status === "pending" && (
                              <>
                                <button
                                  onClick={() => doReview(sub, "approved")}
                                  disabled={actionLoading === sub.id}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-full disabled:opacity-50"
                                  title="Approve">
                                  <CheckCircle className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => doReview(sub, "rejected")}
                                  disabled={actionLoading === sub.id}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-full disabled:opacity-50"
                                  title="Reject">
                                  <XCircle className="h-5 w-5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          <CardFooter>
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-gray-700">
                <span className="font-medium">{filtered.length}</span> of{" "}
                <span className="font-medium">{totalCount}</span> submissions
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="bordered"
                  size="md"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}>
                  Previous
                </Button>
                <Button variant="filled" size="md">
                  {page}
                </Button>
                <Button
                  variant="bordered"
                  size="md"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}>
                  Next
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>

      <SidePanel
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="KYC Submission"
        subtitle={selected?.legal_name || undefined}
        width="wide">
        {selected && (
          <KycDetailView
            submission={selected}
            actionLoading={actionLoading === selected.id}
            onReview={(status) => doReview(selected, status)}
          />
        )}
      </SidePanel>
    </AdminLayout>
  );
}
