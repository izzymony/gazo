"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import MetricCard from "@/components/common/MetricCard";
import SectionHeader from "@/components/common/SectionHeader";
import Section from "@/components/common/Section";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/common/Card";
import Button from "@/components/common/Button";
import SearchInput from "@/components/common/SearchInput";
import FilterTabs from "@/components/common/FilterTabs";
import { H3, Text } from "@/components/common/Typography";
import { useShipping } from "@/hooks/api/useApiClient";
import { 
  Truck, 
  MoreHorizontal, 
  Eye, 
  RefreshCcw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  MapPin,
  User,
  Store,
  Calendar,
  Phone,
  Navigation,
  ShoppingCart,
  Loader2
} from "lucide-react";

// Production: No mock data - only real API data

export default function ShippingPage() {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { shipments, loading, error, getShipments } = useShipping();

  // Backend envelope: { data: { data: [] }, page, limit, total, totalPages }.
  // Array lives at data.data; pagination is top-level (matches businesses/products).
  const shipmentsData = shipments?.data?.data || [];
  const pagination = {
    current_page: shipments?.page,
    per_page: shipments?.limit,
    total_count: shipments?.total,
    total_pages: shipments?.totalPages,
  };

  useEffect(() => {
    getShipments(currentPage, 20);
  }, [getShipments, currentPage]);

  // Transform real shipment data to match UI expectations
  const transformShipment = (shipment: any) => {
    const providerData = shipment.provider_data?.[0] || {};
    return {
      id: shipment.id,
      orderId: providerData.order_id || shipment.order_id,
      trackingNumber: providerData.order_id || `TRK-${shipment.id.slice(0, 8)}`,
      customerName: providerData.ship_to?.name || "Unknown Customer",
      customerPhone: providerData.ship_to?.phone || "N/A",
      businessName: providerData.ship_from?.name || "Unknown Store",
      businessId: "1",
      items: providerData.items || [],
      pickupAddress: providerData.ship_from?.address || "N/A",
      deliveryAddress: providerData.ship_to?.address || "N/A",
      shippingPartner: shipment.provider || "Unknown",
      partnerTrackingId: shipment.provider_id || "N/A",
      status: providerData.status || "unknown",
      shippingFee: providerData.payment?.shipping_fee || 0,
      estimatedDelivery: null,
      actualDelivery: null,
      shipDate: shipment.created_at,
      issues: [],
      trackingUrl: providerData.tracking_url || "",
      courier: providerData.courier || {}
    };
  };

  const transformedShipments = shipmentsData.map(transformShipment);

  const filteredShipments = transformedShipments.filter((shipment: any) => {
    const matchesSearch = shipment.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shipment.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shipment.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shipment.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === "all" || shipment.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800";
      case "out_for_delivery":
        return "bg-blue-100 text-blue-800";
      case "in_transit":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-orange-100 text-orange-800";
      case "pending_pickup":
        return "bg-orange-100 text-orange-800";
      case "failed_delivery":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "delivered":
        return "Delivered";
      case "out_for_delivery":
        return "Out for Delivery";
      case "in_transit":
        return "In Transit";
      case "processing":
        return "Processing";
      case "pending_pickup":
        return "Pending Pickup";
      case "failed_delivery":
        return "Failed Delivery";
      case "cancelled":
        return "Cancelled";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "out_for_delivery":
        return <Navigation className="h-4 w-4 text-blue-500" />;
      case "in_transit":
        return <Truck className="h-4 w-4 text-yellow-500" />;
      case "processing":
        return <Clock className="h-4 w-4 text-orange-500" />;
      case "pending_pickup":
        return <Clock className="h-4 w-4 text-orange-500" />;
      case "failed_delivery":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

  const getShippingPartnerColor = (partner: string) => {
    switch (partner?.toLowerCase()) {
      case "gig logistics":
        return "bg-blue-100 text-blue-800";
      case "dhl nigeria":
        return "bg-yellow-100 text-yellow-800";
      case "speedaf express":
        return "bg-green-100 text-green-800";
      case "red star express":
        return "bg-red-100 text-red-800";
      case "courier plus":
        return "bg-purple-100 text-purple-800";
      case "shipbubble":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <AdminLayout>
      <div className="p-8">
        
        {/* Shipping Statistics Section */}
        <Section>
          <SectionHeader 
            title="Shipping Statistics" 
            description="Overview of shipment metrics and delivery performance"
          >
            <Button
              onClick={() => console.log("Export shipments")}
              className="mt-0 w-auto px-6 h-11"
              disabled
              title="Not available yet"
            >
              Export Shipments
            </Button>
          </SectionHeader>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              title="Total Shipments"
              value={loading ? "..." : pagination.total_count?.toString() || "0"}
              icon={Package}
              iconColor="text-blue-500"
            />
            <MetricCard
              title="Delivered"
              value={loading ? "..." : shipmentsData.filter((s: any) => s.provider_data?.[0]?.status === "delivered").length.toString()}
              icon={CheckCircle}
              iconColor="text-green-500"
            />
            <MetricCard
              title="Failed Deliveries"
              value={loading ? "..." : shipmentsData.filter((s: any) => s.provider_data?.[0]?.status === "failed_delivery").length.toString()}
              icon={XCircle}
              iconColor="text-red-500"
            />
            <MetricCard
              title="In Transit"
              value={loading ? "..." : shipmentsData.filter((s: any) => s.provider_data?.[0]?.status === "in_transit").length.toString()}
              icon={Truck}
              iconColor="text-yellow-500"
            />
          </div>
        </Section>

        {/* Shipping Management Section */}
        <Section>
          <Card padding={false}>
            {/* Section Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <H3 className="text-lg font-semibold text-gray-900">All Shipments</H3>
                  <Text className="text-sm text-gray-600 mt-1">
                    {loading ? 'Loading shipments...' : 
                     shipmentsData.length > 0 ? `Showing ${shipmentsData.length} of ${pagination.total_count || 0} shipments` : 
                     'Search, filter, and manage platform shipments'}
                  </Text>
                </div>
                
                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <SearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search shipments by ID, order, customer, or tracking..."
                    className="w-full sm:w-64"
                  />
                  
                  <FilterTabs
                    filters={[
                      { key: "all", label: "All Shipments", count: shipmentsData.length },
                      { key: "processing", label: "Processing", count: shipmentsData.filter((s: any) => s.provider_data?.[0]?.status === "processing").length },
                      { key: "in_transit", label: "In Transit", count: shipmentsData.filter((s: any) => s.provider_data?.[0]?.status === "in_transit").length },
                      { key: "delivered", label: "Delivered", count: shipmentsData.filter((s: any) => s.provider_data?.[0]?.status === "delivered").length },
                    ]}
                    selectedFilter={selectedFilter}
                    onFilterChange={setSelectedFilter}
                  />
                </div>
              </div>
            </div>

            {/* Shipments Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shipment Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Route
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shipping Partner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timeline
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400 mr-3" />
                        <span className="text-gray-600">Loading shipments...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="text-red-600">
                        <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
                        <span>Error loading shipments: {error}</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredShipments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No shipments found
                    </td>
                  </tr>
                ) : filteredShipments.map((shipment: any) => (
                  <tr key={shipment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">#{shipment.id}</div>
                        <div className="text-sm text-blue-600 font-medium">
                          Order: {shipment.orderId}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {shipment.trackingNumber}
                        </div>
                        <div className="text-sm text-green-600 mt-1">
                          ₦{shipment.shippingFee.toLocaleString()} shipping
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{shipment.customerName}</div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {shipment.customerPhone}
                          </div>
                          <div className="text-xs text-purple-600 flex items-center mt-1">
                            <Store className="h-3 w-3 mr-1" />
                            {shipment.businessName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <div className="text-xs text-gray-600 mb-1">From:</div>
                        <div className="text-sm text-gray-900 flex items-start">
                          <MapPin className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0 text-green-500" />
                          <span className="truncate">{shipment.pickupAddress}</span>
                        </div>
                        <div className="text-xs text-gray-600 mb-1 mt-2">To:</div>
                        <div className="text-sm text-gray-900 flex items-start">
                          <MapPin className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0 text-red-500" />
                          <span className="truncate">{shipment.deliveryAddress}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getShippingPartnerColor(shipment.shippingPartner)}`}>
                          {shipment.shippingPartner}
                        </span>
                        <div className="text-xs text-gray-500 font-mono mt-1">
                          {shipment.partnerTrackingId}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(shipment.status)}
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(shipment.status)}`}>
                          {getStatusText(shipment.status)}
                        </span>
                      </div>
                      {shipment.issues.length > 0 && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            {shipment.issues.length} issue{shipment.issues.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        {shipment.shipDate && (
                          <div className="flex items-center mb-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span className="text-xs">
                              Shipped: {new Date(shipment.shipDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {shipment.estimatedDelivery && (
                          <div className="flex items-center mb-1">
                            <Clock className="h-3 w-3 mr-1 text-yellow-500" />
                            <span className="text-xs">
                              ETA: {new Date(shipment.estimatedDelivery).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {shipment.actualDelivery && (
                          <div className="flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                            <span className="text-xs">
                              Delivered: {new Date(shipment.actualDelivery).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => console.log("View shipment", shipment.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-full border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {shipment.issues.length > 0 && (
                          <button 
                            onClick={() => console.log("Handle issues", shipment.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => console.log("Refresh shipment", shipment.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-full border border-green-200 text-green-600 hover:bg-green-50 transition-colors"
                        >
                          <RefreshCcw className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => console.log("More actions", shipment.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <CardFooter>
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{((pagination.current_page || 1) - 1) * (pagination.per_page || 20) + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min((pagination.current_page || 1) * (pagination.per_page || 20), pagination.total_count || 0)}
                </span>{" "}
                of <span className="font-medium">{pagination.total_count || 0}</span> results
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={() => setCurrentPage(currentPage - 1)}
                  variant="bordered"
                  className="mt-0 w-auto px-3 h-10 text-sm"
                  disabled={currentPage <= 1}
                >
                  Previous
                </Button>
                <Button 
                  className="mt-0 w-auto px-3 h-10 text-sm"
                  disabled
                >
                  {currentPage}
                </Button>
                <Button 
                  onClick={() => setCurrentPage(currentPage + 1)}
                  variant="bordered"
                  className="mt-0 w-auto px-3 h-10 text-sm"
                  disabled={currentPage >= (pagination.total_pages || 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>
        </Section>

      </div>
    </AdminLayout>
  );
}