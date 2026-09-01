"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import MetricCard from "@/components/common/MetricCard";
import SectionHeader from "@/components/common/SectionHeader";
import Section from "@/components/common/Section";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/common/Card";
import Button from "@/components/common/Button";
import { H3, Text } from "@/components/common/Typography";
import SearchInput from "@/components/common/SearchInput";
import FilterTabs from "@/components/common/FilterTabs";
import { 
  Store, 
  MoreHorizontal, 
  Eye, 
  CheckCircle, 
  XCircle,
  Clock,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Package,
  DollarSign,
  AlertTriangle,
  Users,
  Loader2,
  Star,
  Edit,
  MessageCircle,
  FileText,
  BarChart,
  Ban
} from "lucide-react";
import { useBusinesses } from "@/hooks/api/useApiClient";
import { useRouter } from "next/navigation";
import DropdownMenu, { DropdownMenuItem } from "@/components/common/DropdownMenu";
import { toast } from "sonner";

interface BusinessAddress {
  address_line: string;
  address_line_two?: string;
  country: string;
  province: string;
}

interface BusinessSetting {
  shipping_type: string;
  shipping_amount: number;
}

interface Business {
  id: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  tag: string;
  logo?: string;
  order_count: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  address?: BusinessAddress;
  business_setting?: BusinessSetting;
  instagram_profile?: string;
  tiktok_profile?: string;
  facebook_profile?: string;
  whatsapp_profile?: string;
  x_profile?: string;
}

export default function BusinessesPage() {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const { loading, error, getBusinesses, getBusiness } = useBusinesses();
  const router = useRouter();

  const fetchBusinesses = async (page = 1, search = "") => {
    const result = await getBusinesses(page, 20, search) as any;
    if (result) {
      const items = result?.data?.data || [];
      setBusinesses(items);
      setPagination({
        current_page: result.page || page,
        total_pages: result.totalPages || 1,
        total_count: result.total || items.length,
        per_page: result.limit || 20,
      });
    }
  };

  useEffect(() => {
    fetchBusinesses(currentPage, searchTerm);
  }, [currentPage]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      fetchBusinesses(1, searchTerm);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const filteredBusinesses = businesses.filter(business => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "verified") return business.order_count > 0; // Simple heuristic
    if (selectedFilter === "pending") return business.order_count === 0;
    return true;
  });

  const getBusinessStats = () => {
    const totalBusinesses = businesses.length;
    const verified = businesses.filter(business => business.order_count > 0).length;
    const pending = businesses.filter(business => business.order_count === 0).length;
    
    return {
      total: pagination?.total_count || totalBusinesses,
      verified,
      pending,
      active: businesses.length // All businesses are considered active for now
    };
  };

  const stats = getBusinessStats();

  const getStatusBadge = (business: Business) => {
    if (business.order_count > 0) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          <Clock className="w-3 h-3 mr-1" />
          New
        </span>
      );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Action handlers
  const handleVerifySuspendBusiness = async (business: Business) => {
    const isVerified = business.tag === 'verified';
    const action = isVerified ? 'suspend' : 'verify';
    
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1000)),
      {
        loading: `${action === 'verify' ? 'Verifying' : 'Suspending'} business...`,
        success: `Business ${action === 'verify' ? 'verified' : 'suspended'} successfully`,
        error: `Failed to ${action} business`
      }
    );
    fetchBusinesses(currentPage, searchTerm);
  };

  const handleFeatureBusiness = (business: Business) => {
    toast.success(`Business ${business.name} featured successfully`);
  };

  const handleEditBusiness = (businessId: string) => {
    router.push(`/businesses/${businessId}/edit`);
  };

  const handleViewProducts = (businessId: string) => {
    router.push(`/products?businessId=${businessId}`);
  };

  const handleViewOrders = (businessId: string) => {
    router.push(`/orders?businessId=${businessId}`);
  };

  const handleViewAnalytics = (businessId: string) => {
    router.push(`/analytics/businesses/${businessId}`);
  };

  const handleContactOwner = (business: Business) => {
    toast.info(`Opening message to ${business.name} owner`);
  };

  const handleViewKYC = (businessId: string) => {
    router.push(`/kyc?businessId=${businessId}`);
  };

  const handleRowClick = (businessId: string) => {
    // This will open the side panel in Phase 1
    console.log('Open business detail panel:', businessId);
  };

  const getBusinessInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 2);
  };

  if (loading && businesses.length === 0) {
    return (
      <AdminLayout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-brandDeep" />
            <Text>Loading businesses...</Text>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error && businesses.length === 0) {
    return (
      <AdminLayout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <H3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Businesses</H3>
            <Text className="text-gray-600 mb-4">{error}</Text>
            <button 
              onClick={() => fetchBusinesses(currentPage, searchTerm)}
              className="px-4 py-2 bg-brand text-brandInk rounded-lg hover:bg-brandDark transition-colors"
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
        
        {/* Business Statistics Section */}
        <Section>
          <SectionHeader 
            title="Business Management" 
            description="Monitor and manage all platform businesses and vendors"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Businesses"
              value={stats.total.toLocaleString()}
              icon={Store}
              iconColor="text-purple-500"
            />
            <MetricCard
              title="Active Businesses"
              value={stats.verified.toLocaleString()}
              icon={CheckCircle}
              iconColor="text-green-500"
            />
            <MetricCard
              title="New Businesses"
              value={stats.pending.toLocaleString()}
              icon={Clock}
              iconColor="text-yellow-500"
            />
            <MetricCard
              title="Registered Today"
              value="0"
              icon={Calendar}
              iconColor="text-blue-500"
            />
          </div>
        </Section>

        {/* Business List Section */}
        <Section>
          <Card padding={false}>
            {/* Section Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <H3 className="text-lg font-semibold text-gray-900">All Businesses</H3>
                  <Text className="text-sm text-gray-600 mt-1">
                    {pagination && `Showing ${pagination.current_page} of ${pagination.total_pages} pages (${pagination.total_count} total businesses)`}
                  </Text>
                </div>
                
                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <SearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search businesses..."
                    className="w-full sm:w-64"
                  />
                  
                  <FilterTabs
                    filters={[
                      { key: "all", label: "All Businesses" },
                      { key: "verified", label: "Verified" },
                      { key: "pending", label: "Pending" }
                    ]}
                    selectedFilter={selectedFilter}
                    onFilterChange={setSelectedFilter}
                  />
                </div>
              </div>
            </div>

            {/* Businesses Table */}
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredBusinesses.map((business) => (
                      <tr 
                        key={business.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleRowClick(business.id)}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {business.logo ? (
                                <img
                                  className="h-10 w-10 rounded-full object-cover"
                                  src={business.logo}
                                  alt={business.name}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                                  <span className="text-white font-medium text-sm">
                                    {getBusinessInitials(business.name)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {business.name}
                              </div>
                              <div className="text-sm text-gray-500">@{business.tag}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {business.category}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="space-y-1">
                            <div className="flex items-center text-sm text-gray-900">
                              <Mail className="w-3 h-3 mr-2 text-gray-400" />
                              {business.email}
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <Phone className="w-3 h-3 mr-2 text-gray-400" />
                              {business.phone}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {business.address ? (
                            <div className="flex items-center text-sm text-gray-900">
                              <MapPin className="w-3 h-3 mr-2 text-gray-400" />
                              <span className="truncate max-w-32">
                                {business.address.province}, {business.address.country}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">No address</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center text-sm text-gray-900">
                            <Package className="w-3 h-3 mr-2 text-gray-400" />
                            {business.order_count}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {getStatusBadge(business)}
                        </td>
                        <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center space-x-2">
                            {/* Primary Action: Verify/Suspend — disabled (no backend) */}
                            <button
                              onClick={() => handleVerifySuspendBusiness(business)}
                              disabled
                              className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-300 cursor-not-allowed"
                              title="Not available yet"
                            >
                              {business.tag === 'verified' ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            </button>

                            {/* Secondary Action: Feature — disabled (no backend) */}
                            <button
                              onClick={() => handleFeatureBusiness(business)}
                              disabled
                              className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-300 cursor-not-allowed"
                              title="Not available yet"
                            >
                              <Star className="h-4 w-4" />
                            </button>
                            
                            {/* More Actions Menu */}
                            <DropdownMenu
                              items={[
                                {
                                  label: 'Edit Business Info',
                                  icon: <Edit className="h-4 w-4" />,
                                  onClick: () => handleEditBusiness(business.id)
                                },
                                {
                                  label: 'View Products',
                                  icon: <Package className="h-4 w-4" />,
                                  onClick: () => handleViewProducts(business.id)
                                },
                                {
                                  label: 'View Orders',
                                  icon: <Store className="h-4 w-4" />,
                                  onClick: () => handleViewOrders(business.id)
                                },
                                {
                                  label: 'View Analytics',
                                  icon: <BarChart className="h-4 w-4" />,
                                  onClick: () => handleViewAnalytics(business.id)
                                },
                                {
                                  // No backend messaging — disabled so it can't imply a message was sent.
                                  label: 'Contact Owner',
                                  icon: <MessageCircle className="h-4 w-4" />,
                                  onClick: () => handleContactOwner(business),
                                  disabled: true
                                },
                                {
                                  label: 'View KYC Documents',
                                  icon: <FileText className="h-4 w-4" />,
                                  onClick: () => handleViewKYC(business.id)
                                }
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <Text className="text-sm text-gray-700">
                Showing page {pagination.current_page} of {pagination.total_pages}
              </Text>
              <div className="flex gap-2">
                <Button
                  variant="bordered"
                  size="md"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1 || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="bordered"
                  size="md"
                  onClick={() => setCurrentPage(Math.min(pagination.total_pages, currentPage + 1))}
                  disabled={currentPage === pagination.total_pages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
          
          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-brandDeep" />
            </div>
          )}
        </Section>
      </div>
    </AdminLayout>
  );
}