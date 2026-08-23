"use client";

import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import MetricCard from "@/components/common/MetricCard";
import SectionHeader from "@/components/common/SectionHeader";
import Section from "@/components/common/Section";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/common/Card";
import SearchInput from "@/components/common/SearchInput";
import FilterTabs from "@/components/common/FilterTabs";
import Button from "@/components/common/Button";
import { H3, Text } from "@/components/common/Typography";
import {
  ShoppingCart,
  MoreHorizontal,
  Eye,
  RefreshCcw,
  Truck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  DollarSign,
  User,
  Store,
  Calendar,
  MapPin,
  CreditCard,
  MessageCircle,
  FileText,
  Download,
  Ban,
  Repeat,
  Trash2
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import DropdownMenu, { DropdownMenuItem } from "@/components/common/DropdownMenu";
import SidePanel from "@/components/common/SidePanel";
import OrderDetailView from "@/components/orders/OrderDetailView";

// Helper: Get status from seller_activity array (same as seller dashboard)
const getItemStatus = (item: any): string => {
  if (item.seller_activity?.length > 0) {
    return item.seller_activity[item.seller_activity.length - 1].title;
  }
  return 'Order Placed';
};

// Helper: Get status badge color based on activity title
const getStatusColor = (status: string): { bg: string; text: string; icon: any } => {
  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes('delivered')) return { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle };
  if (lowerStatus.includes('transit') || lowerStatus.includes('picked')) return { bg: 'bg-purple-100', text: 'text-purple-800', icon: Truck };
  if (lowerStatus.includes('out for delivery')) return { bg: 'bg-blue-100', text: 'text-blue-800', icon: Truck };
  if (lowerStatus.includes('shipping') || lowerStatus.includes('processing') || lowerStatus.includes('rider')) return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Package };
  if (lowerStatus.includes('payment confirmed')) return { bg: 'bg-teal-100', text: 'text-teal-800', icon: CheckCircle };
  if (lowerStatus.includes('cancelled')) return { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle };
  return { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock };
};

export default function OrdersPage() {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedOrderItemId, setSelectedOrderItemId] = useState<string | null>(null);
  const [selectedProductName, setSelectedProductName] = useState<string | undefined>(undefined);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [apiStats, setApiStats] = useState({
    totalOrders: 0,
    completedOrders: 0,
    disputedOrders: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch order items and products from API
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch both order items and products in parallel
      const [ordersResponse, productsResponse] = await Promise.all([
        apiClient.getAllOrderItemsList(1, 100),
        apiClient.getAllProducts(1, 1000)
      ]);

      console.log('OrderItems API Response:', ordersResponse);
      console.log('Products API Response:', productsResponse);

      // Extract order items
      const items = ordersResponse?.data?.data || [];
      const totalCount = (ordersResponse as any)?.total || items.length;

      // Extract products (backend envelope: data.data, not data.products)
      const productsList = productsResponse?.data?.data || [];

      console.log('Extracted order items:', items.length);
      console.log('Extracted products:', productsList.length);

      if (items.length > 0) {
        console.log('First order item structure:', items[0]);
        console.log('seller_activity:', items[0]?.seller_activity);
      }

      setOrderItems(items);
      setProducts(productsList);

      // Calculate stats based on activity status
      const completed = items.filter((item: any) => {
        const status = getItemStatus(item).toLowerCase();
        return status.includes('delivered');
      }).length;

      const disputed = items.filter((item: any) => {
        const status = getItemStatus(item).toLowerCase();
        return status.includes('cancelled') || status.includes('disputed');
      }).length;

      const totalRevenue = items.reduce((sum: number, item: any) =>
        sum + ((item.price || 0) * (item.quantity || 1)), 0
      );

      setApiStats({
        totalOrders: totalCount,
        completedOrders: completed,
        disputedOrders: disputed,
        totalRevenue: totalRevenue
      });

    } catch (error) {
      console.error("Error fetching data:", error);
      setOrderItems([]);
      setProducts([]);
      setApiStats({
        totalOrders: 0,
        completedOrders: 0,
        disputedOrders: 0,
        totalRevenue: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get product by ID
  const getProduct = (productId: string) => {
    return products.find(p => p.id === productId);
  };

  // Filter order items
  const filteredItems = orderItems.filter(item => {
    const itemId = (item?.id || '').toLowerCase();
    const productName = (getProduct(item.product_id)?.title || '').toLowerCase();
    const customerName = `${item.order?.user?.firstname || ''} ${item.order?.user?.lastname || ''}`.toLowerCase();

    const matchesSearch = itemId.includes(searchTerm.toLowerCase()) ||
                         productName.includes(searchTerm.toLowerCase()) ||
                         customerName.includes(searchTerm.toLowerCase());

    const itemStatus = getItemStatus(item).toLowerCase();
    let matchesFilter = selectedFilter === "all";
    if (selectedFilter === "processing") {
      matchesFilter = itemStatus.includes('shipping') || itemStatus.includes('processing') || itemStatus.includes('rider');
    } else if (selectedFilter === "shipped") {
      matchesFilter = itemStatus.includes('transit') || itemStatus.includes('picked') || itemStatus.includes('out for delivery');
    } else if (selectedFilter === "disputed") {
      matchesFilter = itemStatus.includes('cancelled') || itemStatus.includes('disputed');
    }

    return matchesSearch && matchesFilter;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Action handlers
  const handleUpdateOrderStatus = (item: any) => {
    const product = products.find(p => p.id === item.product_id);
    setSelectedOrderItemId(item.id);
    setSelectedProductName(product?.title || product?.name);
    setIsPanelOpen(true);
  };

  const handleContactCustomer = (item: any) => {
    const name = `${item.order?.user?.firstname || ''} ${item.order?.user?.lastname || ''}`.trim() || 'Customer';
    toast.success(`Opening message to ${name}`);
  };

  const handleViewShipment = (itemId: string) => {
    router.push(`/shipping?orderId=${itemId}`);
  };

  const handleProcessRefund = (item: any) => {
    const amount = (item.price || 0) * (item.quantity || 1);
    if (confirm(`Process refund of ${formatCurrency(amount)} for order #${item.order?.invoice}?`)) {
      toast.promise(
        new Promise((resolve) => setTimeout(resolve, 1000)),
        {
          loading: 'Processing refund...',
          success: 'Refund processed successfully',
          error: 'Failed to process refund'
        }
      );
    }
  };

  const handleExportOrder = (itemId: string) => {
    toast.success('Order data exported');
  };

  const handlePrintInvoice = (itemId: string) => {
    window.print();
  };

  const handleDeleteOrder = async (item: any) => {
    const itemTotal = (item.price || 0) * (item.quantity || 1);
    if (confirm(`Are you sure you want to delete order #${item.order?.invoice}?\n\nThis will:\n- Remove the order item from the database\n- Reverse any wallet transactions (${formatCurrency(itemTotal)})\n- Delete the parent order if no items remain\n\nThis action cannot be undone.`)) {
      toast.promise(
        apiClient.deleteOrderItem(item.id).then(() => {
          fetchData(); // Refresh the list
        }),
        {
          loading: 'Deleting order...',
          success: 'Order deleted successfully',
          error: 'Failed to delete order'
        }
      );
    }
  };

  const handleRowClick = (item: any) => {
    const product = products.find(p => p.id === item.product_id);
    setSelectedOrderItemId(item.id);
    setSelectedProductName(product?.title || product?.name);
    setIsPanelOpen(true);
  };

  const handlePanelClose = () => {
    setIsPanelOpen(false);
    setSelectedOrderItemId(null);
    setSelectedProductName(undefined);
  };

  return (
    <AdminLayout>
      <div className="p-8">

        {/* Order Statistics Section */}
        <Section>
          <SectionHeader
            title="Order Statistics"
            description="Overview of order metrics and transaction status"
          >
            <Button variant="filled" size="md">
              Export Orders
            </Button>
          </SectionHeader>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              title="Total Orders"
              value={apiStats.totalOrders.toString()}
              icon={ShoppingCart}
              iconColor="text-blue-500"
            />
            <MetricCard
              title="Completed Orders"
              value={apiStats.completedOrders.toString()}
              icon={CheckCircle}
              iconColor="text-green-500"
            />
            <MetricCard
              title="Disputed Orders"
              value={apiStats.disputedOrders.toString()}
              icon={AlertTriangle}
              iconColor="text-red-500"
            />
            <MetricCard
              title="Revenue This Month"
              value={apiStats.totalRevenue > 999999
                ? formatCurrency(apiStats.totalRevenue).replace(/₦(\d+),(\d+),(\d+)/, '₦$1.$2M')
                : formatCurrency(apiStats.totalRevenue)
              }
              icon={DollarSign}
              iconColor="text-green-500"
            />
          </div>
        </Section>

        {/* Orders Management Section */}
        <Section>
          <Card padding={false}>
            {/* Section Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <H3 className="text-lg font-semibold text-gray-900">All Orders</H3>
                  <Text className="text-sm text-gray-600 mt-1">
                    {orderItems.length > 0 ? `Showing ${filteredItems.length} of ${orderItems.length} order items` : 'Search, filter, and manage platform orders'}
                  </Text>
                </div>

                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <SearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search by ID, product, or customer..."
                    className="w-full sm:w-64"
                  />

                  <FilterTabs
                    filters={[
                      { key: "all", label: "All Orders", count: orderItems.length },
                      { key: "processing", label: "Processing", count: orderItems.filter(i => {
                        const s = getItemStatus(i).toLowerCase();
                        return s.includes('shipping') || s.includes('processing') || s.includes('rider');
                      }).length },
                      { key: "shipped", label: "Shipped", count: orderItems.filter(i => {
                        const s = getItemStatus(i).toLowerCase();
                        return s.includes('transit') || s.includes('picked') || s.includes('out for delivery');
                      }).length },
                      { key: "disputed", label: "Disputed", count: orderItems.filter(i => {
                        const s = getItemStatus(i).toLowerCase();
                        return s.includes('cancelled') || s.includes('disputed');
                      }).length },
                    ]}
                    selectedFilter={selectedFilter}
                    onFilterChange={setSelectedFilter}
                  />
                </div>
              </div>
            </div>

            {/* Orders Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seller
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
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
                {filteredItems.map((item) => {
                  const product = getProduct(item.product_id);
                  const status = getItemStatus(item);
                  const statusColor = getStatusColor(status);
                  const StatusIcon = statusColor.icon;
                  const customerName = `${item.order?.user?.firstname || ''} ${item.order?.user?.lastname || ''}`.trim() || 'Unknown Customer';
                  const customerEmail = item.order?.user?.email || 'No Email';
                  const itemTotal = (item.price || 0) * (item.quantity || 1);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleRowClick(item)}
                    >
                      {/* Order ID - show full ID with truncation at max width */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]" title={item.order?.invoice}>#{item.order?.invoice}</div>
                          <div className="text-sm text-gray-500">
                            Qty: {item.quantity || 1}
                          </div>
                          <div className="text-sm font-medium text-green-600">
                            {formatCurrency(itemTotal)}
                          </div>
                        </div>
                      </td>

                      {/* Product - lookup by product_id (same as seller dashboard) */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {product?.image?.[0] && (
                            <img
                              src={product.image[0]}
                              alt={product.title || 'Product'}
                              className="h-10 w-10 rounded-lg object-cover mr-3"
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {product?.title?.slice(0, 20) || 'Unknown Product'}{product?.title?.length > 20 ? '...' : ''}
                            </div>
                            <div className="text-xs text-gray-500">
                              {product?.category?.name || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Customer - from order.user */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{customerName}</div>
                            <div className="text-sm text-gray-500">{customerEmail}</div>
                          </div>
                        </div>
                      </td>

                      {/* Seller - from business relation */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {item.business?.logo ? (
                            <img
                              src={item.business.logo}
                              alt={item.business.name || 'Seller'}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-green-500 rounded-full flex items-center justify-center">
                              <Store className="h-5 w-5 text-white" />
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {item.business?.name || 'Unknown Seller'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.business?.username ? `@${item.business.username}` : item.business_id?.slice(0, 8) || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status - from seller_activity[last].title */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <StatusIcon className={`h-4 w-4 ${statusColor.text} mr-2`} />
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
                            {status}
                          </span>
                        </div>
                      </td>

                      {/* Payment - method only, no status badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-700">
                          <CreditCard className="h-4 w-4 mr-2 text-gray-400" />
                          {item.order?.payment_method || 'N/A'}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          <div>
                            <div>{new Date(item.created_at).toLocaleDateString()}</div>
                            <div className="text-xs text-gray-400">
                              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center space-x-2 justify-end">
                          {/* Primary Action: Update Status */}
                          <button
                            onClick={() => handleUpdateOrderStatus(item)}
                            className="w-8 h-8 flex items-center justify-center rounded-full border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Update Status"
                          >
                            <Package className="h-4 w-4" />
                          </button>

                          {/* Secondary Action: Contact Customer */}
                          <button
                            onClick={() => handleContactCustomer(item)}
                            className="w-8 h-8 flex items-center justify-center rounded-full border border-green-200 text-green-600 hover:bg-green-50 transition-colors"
                            title="Contact Customer"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>

                          {/* More Actions Menu */}
                          <DropdownMenu
                            items={[
                              {
                                label: 'View Shipment Details',
                                icon: <Truck className="h-4 w-4" />,
                                onClick: () => handleViewShipment(item.id)
                              },
                              {
                                // No backend refund flow exists — disabled so it
                                // can't imply money moved when it didn't.
                                label: 'Process Refund',
                                icon: <Repeat className="h-4 w-4" />,
                                onClick: () => handleProcessRefund(item),
                                disabled: true
                              },
                              {
                                label: 'Export Order Data',
                                icon: <Download className="h-4 w-4" />,
                                onClick: () => handleExportOrder(item.id),
                                disabled: true
                              },
                              {
                                label: 'Print Invoice',
                                icon: <FileText className="h-4 w-4" />,
                                onClick: () => handlePrintInvoice(item.id)
                              },
                              {
                                label: 'Delete Order',
                                icon: <Trash2 className="h-4 w-4" />,
                                onClick: () => handleDeleteOrder(item),
                                variant: 'danger',
                                divider: true
                              }
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <CardFooter>
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredItems.length}</span> of{" "}
                <span className="font-medium">{filteredItems.length}</span> results
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
        </Section>

      </div>

      {/* Order Detail Side Panel */}
      <SidePanel
        isOpen={isPanelOpen}
        onClose={handlePanelClose}
        title="Order Details"
        subtitle={selectedOrderItemId ? `Order #${orderItems.find(item => item.id === selectedOrderItemId)?.order?.invoice || selectedOrderItemId}` : ''}
        width="wide"
      >
        {selectedOrderItemId && (
          <OrderDetailView
            orderItemId={selectedOrderItemId}
            productName={selectedProductName}
            onClose={handlePanelClose}
            onStatusUpdate={() => {
              fetchData(); // Refresh the orders list after status update
            }}
          />
        )}
      </SidePanel>
    </AdminLayout>
  );
}
