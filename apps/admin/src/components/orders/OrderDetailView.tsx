"use client";

import { useEffect, useState } from 'react';
import {
  Package, Truck, User, MapPin, Calendar, Clock,
  CheckCircle, XCircle, AlertTriangle, Loader2,
  ChevronRight, ExternalLink
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { H3, Text } from '@/components/common/Typography';
import Button from '@/components/common/Button';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface OrderDetailViewProps {
  orderItemId: string;
  productName?: string;
  onClose: () => void;
  onStatusUpdate?: () => void;
}

const STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Confirmed (Courier Assigned)', description: 'Courier has been assigned to pick up the order' },
  { value: 'picked_up', label: 'Picked Up', description: 'Order has been picked up from the seller' },
  { value: 'in_transit', label: 'In Transit / Out for Delivery', description: 'Order is on its way to the buyer' },
  { value: 'completed', label: 'Delivered', description: 'Order has been delivered successfully' },
  { value: 'cancelled', label: 'Cancelled', description: 'Order has been cancelled' },
];

export default function OrderDetailView({ orderItemId, productName, onClose, onStatusUpdate }: OrderDetailViewProps) {
  const [orderItem, setOrderItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Status update form state
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchOrderItemDetails();
  }, [orderItemId]);

  const fetchOrderItemDetails = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getOrderItem(orderItemId) as any;
      const item = response?.data?.data || response?.data || null;
      setOrderItem(item);
    } catch (error) {
      console.error('Error fetching order item details:', error);
      toast.error('Failed to load order item details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus || !reason) {
      toast.error('Please select status and provide a reason');
      return;
    }

    setUpdating(true);
    try {
      await apiClient.updateShippingStatus(orderItemId, newStatus, reason, notes);
      toast.success('Shipping status updated successfully');
      setNewStatus('');
      setReason('');
      setNotes('');
      fetchOrderItemDetails();
      onStatusUpdate?.();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update shipping status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; icon: any }> = {
      'pending': { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock },
      'payment_confirmed': { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle },
      'processing': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Package },
      'shipped': { bg: 'bg-purple-100', text: 'text-purple-800', icon: Truck },
      'delivered': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      'cancelled': { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
    };
    const config = statusMap[status] || statusMap['pending'];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  // Helper: Get status from seller_activity array (same as seller dashboard)
  const getItemStatus = (item: any): string => {
    if (item?.seller_activity?.length > 0) {
      return item.seller_activity[item.seller_activity.length - 1].title;
    }
    return 'Order Placed';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <Text className="ml-3 text-gray-600">Loading order item details...</Text>
      </div>
    );
  }

  if (!orderItem) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <Text className="text-gray-600">Order item not found</Text>
      </div>
    );
  }

  const shipment = orderItem?.shipment;
  const providerData = shipment?.provider_data?.[0] || {};
  const currentStatus = getItemStatus(orderItem);

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="truncate max-w-[300px]" title={orderItem?.order?.invoice || orderItemId}>
                <H3 className="text-xl font-semibold text-gray-900">
                  Order #{orderItem?.order?.invoice || orderItemId}
                </H3>
              </div>
              <Text className="text-sm text-gray-500 mt-1">
                {productName || orderItem?.product?.name || 'Product'}
              </Text>
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800`}>
              {currentStatus}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Item Details */}
      <Card>
        <CardHeader>
          <H3 className="text-lg font-medium">Item Details</H3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Text className="text-sm font-medium text-gray-500">Product</Text>
              <Text className="font-medium">{productName || orderItem?.product?.name || 'N/A'}</Text>
            </div>
            <div>
              <Text className="text-sm font-medium text-gray-500">Quantity</Text>
              <Text>{orderItem?.quantity || 0}</Text>
            </div>
            <div>
              <Text className="text-sm font-medium text-gray-500">Price</Text>
              <Text className="font-medium text-green-600">
                {formatCurrency(orderItem?.price * orderItem?.quantity)}
              </Text>
            </div>
            <div>
              <Text className="text-sm font-medium text-gray-500">Status</Text>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800`}>
                {currentStatus}
              </span>
            </div>
          </div>

          {/* Order/Customer Info */}
          {orderItem?.order && (
            <div className="pt-4 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Text className="text-sm font-medium text-gray-500">Customer</Text>
                  <Text className="font-medium">
                    {orderItem.order.user?.firstname} {orderItem.order.user?.lastname}
                  </Text>
                  <Text className="text-sm text-gray-500">{orderItem.order.user?.email}</Text>
                </div>
                <div>
                  <Text className="text-sm font-medium text-gray-500">Payment Method</Text>
                  <Text className="capitalize">{orderItem.order.payment_method || 'N/A'}</Text>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shipment Information */}
      {shipment && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <H3 className="text-lg font-medium">Shipment Details</H3>
              {providerData.tracking_url && (
                <a
                  href={providerData.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Track on Shipbubble
                </a>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Text className="text-sm font-medium text-gray-500">Tracking ID</Text>
                <Text className="font-mono text-sm">{shipment.provider_id || 'N/A'}</Text>
              </div>
              <div>
                <Text className="text-sm font-medium text-gray-500">Provider</Text>
                <Text className="capitalize">{shipment.provider || 'N/A'}</Text>
              </div>
              <div>
                <Text className="text-sm font-medium text-gray-500">Courier</Text>
                <Text>{providerData.courier?.name || 'N/A'}</Text>
              </div>
              <div>
                <Text className="text-sm font-medium text-gray-500">Provider Status</Text>
                <Text className="capitalize font-medium">
                  {providerData.status || 'N/A'}
                  {providerData.admin_override && (
                    <span className="ml-2 text-xs text-orange-600">(Admin Override)</span>
                  )}
                </Text>
              </div>
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <Text className="text-sm font-medium text-gray-500 mb-2">From (Seller)</Text>
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <Text className="font-medium">{providerData.ship_from?.name || 'N/A'}</Text>
                    <Text className="text-sm text-gray-500">{providerData.ship_from?.address || 'N/A'}</Text>
                  </div>
                </div>
              </div>
              <div>
                <Text className="text-sm font-medium text-gray-500 mb-2">To (Buyer)</Text>
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <Text className="font-medium">{providerData.ship_to?.name || 'N/A'}</Text>
                    <Text className="text-sm text-gray-500">{providerData.ship_to?.address || 'N/A'}</Text>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Status Update */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
            <H3 className="text-lg font-medium">Manual Status Override</H3>
          </div>
          <Text className="text-sm text-gray-500 mt-1">
            Use this when Shipbubble webhooks fail to update status automatically
          </Text>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Status <span className="text-red-500">*</span>
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="">Select new status...</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {newStatus && (
              <Text className="text-xs text-gray-500 mt-1">
                {STATUS_OPTIONS.find(o => o.value === newStatus)?.description}
              </Text>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Manual Update <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Webhook failed, verified with customer via phone"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* Warning for Delivered */}
          {newStatus === 'completed' && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                <Text className="text-sm text-yellow-800">
                  <strong>Important:</strong> Marking as delivered will credit the seller&apos;s wallet with the order amount.
                  Only proceed if you have verified the delivery.
                </Text>
              </div>
            </div>
          )}

          {/* Warning for Cancelled */}
          {newStatus === 'cancelled' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <XCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" />
                <Text className="text-sm text-red-800">
                  <strong>Warning:</strong> Cancelling the order will notify the buyer. This action should only be taken
                  if the order cannot be fulfilled.
                </Text>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <Button
              onClick={handleStatusUpdate}
              disabled={!newStatus || !reason || updating}
              className="flex-1"
            >
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Update Status
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline - Show both buyer and seller activity */}
      <Card>
        <CardHeader>
          <H3 className="text-lg font-medium">Activity Timeline</H3>
        </CardHeader>
        <CardContent>
          {(orderItem?.seller_activity?.length > 0 || orderItem?.buyer_activity?.length > 0) ? (
            <div className="space-y-4">
              {/* Show seller activity for admin view */}
              {orderItem.seller_activity && [...orderItem.seller_activity].reverse().map((activity: any, index: number) => (
                <div key={`seller-${index}`} className="flex items-start">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500" />
                  <div className="ml-4">
                    <Text className="font-medium">{activity.title}</Text>
                    <Text className="text-sm text-gray-500">{activity.details}</Text>
                    <Text className="text-xs text-gray-400 mt-1">
                      {activity.time ? formatDate(activity.time) : 'N/A'}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <Text>No activity recorded</Text>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
