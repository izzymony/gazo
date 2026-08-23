/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useEffect, useState } from "react";
import DataSort from "@/features/seller-dashboard/datasort";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@/design-system/common/Header";
import Button from "@/design-system/common/Button";
import { IoCubeOutline, DeliveryTruck } from "@/design-system/icons";
import { useRouter } from "next/navigation";
import useOrderStore from "@/store/orderStore";
import useBusinessStore from "@/store/businessStore";
import { formatCurrency, formatDate, getMobileCompatibleImageUrl } from "@/lib/utils";
import useAuthStore from "@/store/authStore";
import { OrderDatas } from "@/lib/order";
import useShippingStore from "@/store/shippingStore";
import useProductStore from "@/store/productStore";
import StatusBadge from "@/features/seller-dashboard/StatusBadge";
import { deriveSellerStatus } from "@/features/orders/orderStatus";
import EmptyState from "@/design-system/common/EmptyState";

const OrderComp = ({
  order,
  action,
  onOrderUpdated,
}: {
  order: OrderDatas;
  action: (val: OrderDatas) => void;
  onOrderUpdated?: () => void;
}) => {
  const router = useRouter();
  const { products } = useProductStore();
  const { markOrderReady } = useOrderStore();
  const [isUpdating, setIsUpdating] = useState(false);
  const product = products.find((item) => item.id === order.product_id);
  //("nice  ", product);

  // Self vs courier controls which fulfilment CTA the row shows (mirrors the
  // detail page). Self can't be actioned inline — the seller enters the dispatch
  // contact on the detail page — so its CTA navigates there.
  const lastTitle =
    order?.seller_activity?.[(order.seller_activity?.length ?? 0) - 1]?.title ||
    "";
  const lower = lastTitle.toLowerCase();
  const isSelf =
    order?.shipping_option?.provider === "self" ||
    order?.shipment?.provider === "self";
  const isOutForDelivery = lower === "out for delivery" || lower === "shipped";
  const isDelivered = lower === "order delivered";
  const isPaidNew =
    lower === "payment confirmed" || lower === "new order received";
  const showSelfCta = isSelf && !isOutForDelivery && !isDelivered;
  const showCourierCta = !isSelf && isPaidNew;

  return (
    <div
      onClick={() => {
        action(order);
        router.push(`orders/${order?.id}`);
      }}>
      <div className="flex justify-between gap-2">
        <img
          src={product?.image ? getMobileCompatibleImageUrl(product?.image[0]) : ""}
          alt="Product"
          className="object-cover h-10 w-10 rounded-field border border-ink-20"
        />
        <div className="w-[100%]">
          <div className="flex items-center gap-3">
            <span className="text-body font-medium text-ink-90 truncate max-w-[180px]" title={order?.order?.invoice}>
              #{order?.order?.invoice}
            </span>
            <div className=" font-medium text-ink-90 bg-ink-3 flex gap-2 items-center p-1 px-2 rounded-field">
              <p className="flex items-center text-caption">
                {order?.quantity}
              </p>{" "}
              <IoCubeOutline size={20} className="text-ink-90" />
            </div>
            <p className="text-caption font-medium text-ink-40">
              {order?.created_at && formatDate(new Date(order?.created_at))}
            </p>
            <p className="ml-auto font-medium text-ink-90 text-body">
              {formatCurrency(order?.price)}
            </p>
          </div>
          <div className="text-body-sm text-ink-90">
            {product ? `${product.category?.name}...` : ""}
          </div>

          <div className="flex justify-between w-full mt-1">
            <div className="font-medium text-ink-60 text-body-sm">
              @{product ? `${product.title?.slice(0, 10)}...` : ""}
            </div>
            {order?.seller_activity && (
              <StatusBadge status={deriveSellerStatus(order)} />
            )}
          </div>

          {showCourierCta && (
            <Button
              variant="bordered"
              size="sm"
              loading={isUpdating}
              loadingText="Updating..."
              onClick={async () => {
                setIsUpdating(true);
                try {
                  await markOrderReady(order.id);
                  if (onOrderUpdated) onOrderUpdated();
                } catch (error) {
                  console.error("Failed to mark order as ready:", error);
                } finally {
                  setIsUpdating(false);
                }
              }}>
              Mark as ready for shipping
              <DeliveryTruck size={16} className="text-brand" />
            </Button>
          )}
          {showSelfCta && (
            <Button
              variant="bordered"
              size="sm"
              onClick={() => router.push(`orders/${order?.id}`)}>
              Mark out for delivery
              <DeliveryTruck size={16} className="text-brand" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const Page = () => {
  const { fetchGuestOrders, fetchAllSellerOrders, newOrders, setNewOrderItem } =
    useOrderStore();
  const { user } = useAuthStore();
  const { fetchStores } = useBusinessStore();
  const { fetchAllProducts } = useProductStore();
  const [sortOrder, setSortOrder] = useState<"ascending" | "descending">(
    "ascending"
  );
  const { guestId }: any = useShippingStore();
  //(newOrders);
  const [searchValue, setSearchValue] = useState("");

  // const guestId = generateRandomHexId(48);

  useEffect(() => {
    if (user) {
      fetchAllSellerOrders();
      fetchStores();
      fetchAllProducts(); // Fetch products to display product info
    } else {
      fetchGuestOrders(guestId);
    }
  }, []);

  const handleSortToggle = () => {
    setSortOrder((prevOrder) =>
      prevOrder === "ascending" ? "descending" : "ascending"
    );
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  return (
    <PageShell
      header={
        <Header
          showMenu
          customText="Orders"
        />
      }>
      <DataSort
        sortOrder={sortOrder}
        onSortToggle={handleSortToggle}
        onSortOrderChange={setSortOrder}
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
      />
      <div className="space-y-6">
        {newOrders.length > 0 ? (
          newOrders.map((businessOrder, index) => (
            <OrderComp
              key={index}
              order={businessOrder}
              action={setNewOrderItem}
              onOrderUpdated={() => {
                // Refresh orders after successful update
                fetchAllSellerOrders();
              }}
            />
          ))
        ) : (
          <EmptyState
            image="/images/emptystate/awaiting.svg"
            title="No orders yet"
            subtitle="Any order for products from your store will appear here."
          />
        )}
      </div>
    </PageShell>
  );
};

export default Page;
