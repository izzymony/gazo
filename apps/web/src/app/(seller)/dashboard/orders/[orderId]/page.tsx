/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from "react";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@/design-system/common/Header";
import Button from "@vibaar/ui/common/Button";
import Dialog from "@vibaar/ui/common/Dialog";
import InputField from "@vibaar/ui/common/InputField";
import {
  CircleCheck,
  IoCubeOutline,
  FaLocationDot,
  DeliveryTruck,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "@vibaar/ui/icons";
import useOrderStore from "@/store/orderStore";
import Loader from "@vibaar/ui/common/Loader";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import useProductStore from "@/store/productStore";
import { OrderStatusIcon, deriveSellerStatus } from "@/features/orders/orderStatus";
import DispatchContactCard from "@/features/orders/DispatchContactCard";
import { OrderDatas } from "@/lib/order";
import { formatTimeAgos, formatTimestamp } from "@/lib/converter";
import { Client } from "@/lib/client";
import UserProfileImage from "@vibaar/ui/common/UserProfileImage";

const ActivityTop = ({ title, date }: { title: string; date: string }) => {
  return (
    <div className="flex gap-3">
      <OrderStatusIcon status={title} />
      <div className="flex flex-col justify-between">
        <p className="text-ink-60 font-normal text-caption">Status:</p>
        <p className="text-ink-90 font-medium text-h2">{title}</p>
        <p className="text-ink-60 font-normal text-caption">
          {formatTimestamp(date)}
        </p>
      </div>
    </div>
  );
};

const ActivityText = ({
  show = false,
  title,
  details,
  time,
}: {
  show: boolean;
  title: string;
  details: string;
  time: string;
}) => {
  return (
    <div className="mt-2.5 lg:mt-0 gap-1 w-full">
      <div className="flex justify-between items-center">
        <p
          className={`text-body-sm font-medium ${show
            ? `${title.toLowerCase() === "order delivered"
              ? "text-green"
              : "text-brand"
            }`
            : "text-ink-60"
            }`}>
          {title}
        </p>
        <p className="text-caption font-normal text-ink-40">
          {formatTimeAgos(time)}
        </p>
      </div>
      <p className="text-caption font-normal text-ink-40">{details}</p>
    </div>
  );
};

const Check = () => <CircleCheck size={16} className="text-ink-30" />;

const Indicators = ({ show = false }: { show: boolean }) => {
  return (
    <div className="flex flex-col items-center">
      <div
        className={
          !show
            ? "h-[10px] border border-ink-20"
            : "h-[10px] border border-brand"
        }
      />
      {show ? (
        <div className="w-4 h-4 rounded-full border border-brand bg-brand/10 flex justify-center items-center">
          <div className="w-[10px] h-[10px] bg-brand rounded-full" />
        </div>
      ) : (
        <div className="w-4 h-4 rounded-full flex justify-center items-center">
          <Check />
        </div>
      )}
      <div className="flex-1 border border-ink-20" />
    </div>
  );
};

const ActivityCard = ({
  item,
  status,
}: {
  item: { title: string; details: string; subtitle: string; time: string };
  status: boolean;
}) => {
  return (
    <div className="flex gap-4 h-[43px] w-full">
      <Indicators show={status} />
      <ActivityText
        title={item.title}
        show={status}
        time={item.time}
        details={item.details}
      />
    </div>
  );
};

const ItemCard = ({
  name,
  quantity,
  image,
  price
}: {
  name: string;
  quantity: number;
  image?: string;
  price: number;
}) => {
  return (
    <div className="w-full flex space-x-3 border-ink-10 border rounded-field p-2">
      <img
        src={image || "/PRODUCT IMAGE (2).png"}
        className="w-[60px] h-[60px] object-cover rounded-field border border-ink-10"
        alt={name}
      />
      <div className="flex-1 flex-col flex justify-between">
        <p className="text-ink-90 font-normal text-body-sm">{name}</p>
        <div className="flex text-ink-60 text-body-sm font-medium space-x-4">
          <p>{formatCurrency(price)}</p>
          <p className="text-ink-90">x {quantity}</p>
        </div>
      </div>
    </div>
  );
};

const Sales = ({ item1, item2 }: { item1: string; item2: number }) => {
  return (
    <div className="flex justify-between items-center">
      <p className="text-ink-60 text-body-sm font-normal">{item1}</p>
      <p className="text-ink-90 text-body-sm font-medium">
        {formatCurrency(item2)}
      </p>
    </div>
  );
};

const Cards = ({ order, buyerInfo }: { order: OrderDatas; buyerInfo?: {user_name?: string; email?: string; profile_image?: string; firstname?: string; lastname?: string; isGuest?: boolean} | null }) => {
  const { products } = useProductStore();

  // Find the product data for this order
  const product = products.find((item) => item.id === order.product_id);

  return (
    <div className="mt-6 space-y-3">
      <div>
        <div className="flex gap-2 items-center text-body font-medium text-ink-90">
          <IoCubeOutline size={20} className="text-ink-90" />
          items ({order.quantity})
        </div>
      </div>
      <div className="gap-3">
        <ItemCard
          name={product?.title || "Product Name"}
          quantity={order.quantity}
          image={product?.image?.[0] || ""}
          price={order.price}
        />
      </div>
      <div className="border border-ink-10 rounded-card p-3 gap-2 flex flex-col">
        <Sales
          item1={`Subtotal: ${order.quantity} items`}
          item2={order.order?.sub_total || (order.price * order.quantity)}
        />
        <Sales
          item1="Discount:"
          item2={
            product?.original_price ? (+product.original_price - order.price) * order.quantity : 0
          }
        />
        <Sales item1="Total:" item2={order.order?.total || (order.price * order.quantity)}/>
        <div className="flex items-center justify-between w-full py-0">
          <div className="flex gap-2 items-center">
            <UserProfileImage
              src={buyerInfo?.profile_image?.trim() || null}
              userName={buyerInfo?.user_name || "customer"}
              firstName={buyerInfo?.firstname}
              lastName={buyerInfo?.lastname}
              size={20}
              className=""
            />
            <p className="text-body-sm font-medium text-ink-90">
              {buyerInfo?.isGuest ? buyerInfo?.user_name : `@${buyerInfo?.user_name || "customer"}`}
            </p>
          </div>
          <button
            type="button"
            className="border border-brand text-brand rounded-full py-1 px-2 text-caption font-medium">
            Send a message
          </button>
        </div>
      </div>
    </div>
  );
};

const ProgressBar = ({ pick }: { pick: number }) => {
  return (
    <div className="w-full bg-ink-10 rounded-full h-1 my-3 flex justify-between overflow-hidden">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
        <div
          key={item}
          className={
            item > 0 && item <= pick
              ? " bg-brand h-full flex-1"
              : "h-full flex-1"
          }
        />
      ))}
    </div>
  );
};

const Order = ({ params }: { params: { orderId: string } }) => {
  const {
    isLoading,
    newOrder,
    markOrderReady,
    markSelfOutForDelivery,
    markSelfDelivered,
    getSellerOrderById,
  } = useOrderStore();
  const { products, fetchAllProducts } = useProductStore();
  const router = useRouter();
  const [status, setStatus] = useState(false);
  const [isMarkingReady, setIsMarkingReady] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [dispatch, setDispatch] = useState({ name: "", phone: "", note: "" });
  const [buyerInfo, setBuyerInfo] = useState<{user_name?: string; email?: string; profile_image?: string; firstname?: string; lastname?: string; isGuest?: boolean} | null>(null);

  // Fetch products when component mounts to ensure real data is available
  useEffect(() => {
    fetchAllProducts();
  }, [fetchAllProducts]);

  // Fetch order if not in store OR if stale (different from requested orderId)
  // This ensures fresh data when navigating from activities/notifications
  // while preserving efficiency when coming from orders list
  useEffect(() => {
    if (!newOrder || newOrder.id !== params.orderId) {
      getSellerOrderById(params.orderId);
    }
  }, [params.orderId, newOrder, getSellerOrderById]);

  // Fetch buyer information when order is available
  useEffect(() => {
    const fetchBuyerInfo = async () => {
      // For guest orders, use shipping profile data
      if (newOrder?.order?.shipping_profile?.shipping_user && !buyerInfo) {
        const shippingUser = newOrder.order.shipping_profile.shipping_user;
        const fullName = `${shippingUser.firstname || ''} ${shippingUser.lastname || ''}`.trim();
        setBuyerInfo({
          user_name: fullName || 'Guest Customer',
          email: shippingUser.email,
          firstname: shippingUser.firstname,
          lastname: shippingUser.lastname,
          profile_image: undefined,
          isGuest: true
        });
        return;
      }

      // For authenticated orders, fetch user data
      if (newOrder?.order?.user_id && !buyerInfo) {
        try {
          const response = await Client({
            path: `/users/${newOrder.order.user_id}`,
            method: "GET",
          });
          setBuyerInfo((response.data as any).data);
        } catch (error) {
          console.error("Failed to fetch buyer info:", error);
        }
      }
    };

    fetchBuyerInfo();
  }, [newOrder, buyerInfo]);
  const activityOrder: any = [];
  if (newOrder?.seller_activity) {
    for (let i = 0; i < newOrder?.seller_activity?.length; i++) {
      activityOrder.unshift(newOrder.seller_activity[i]);
    }
  }

  // Show loader if loading OR if we don't have the correct order data yet
  if (isLoading || !newOrder || newOrder.id !== params.orderId) {
    return <Loader />;
  }

  const picker: any = {
    // Blue statuses (initial states)
    "order placed": 1,
    "new order received": 1,
    "payment confirmed": 2,
    
    // Yellow statuses (processing)
    "processing for shipping": 3,
    "shipping started": 3,
    "shipping confirmed": 4,
    "shipment created & assigned to a courier": 4,
    "shipping created & assigned to a courier": 4,
    "ready for shipping": 4,
    "courier processing shipping": 4,
    "courier accepted shipping": 4,
    "waiting to be shipped": 4,
    
    // Orange status (rider movement)
    "rider on the way to vendor": 5,
    
    // Purple status (pickup/transit)
    "order picked up & in transit": 6,
    "order picked up": 6,
    "order in transit": 6,
    "package picked up": 6,
    
    // Blue status (delivery)
    "out for delivery": 7,
    "shipped": 7,
    
    // Green status (completed)
    "order delivered": 8,
    
    // Red statuses (cancelled/failed)
    "order cancelled": -1,
    "delivery attempt failed": -2,
    "order returned to vendor": -3,
  };

  const pick = newOrder?.seller_activity
    ? picker[
    newOrder?.seller_activity[
      newOrder.seller_activity.length - 1
    ].title.toLowerCase()
    ]
    : 0;

  // Self-delivery (Shipping D): the seller fulfils the order and drives its
  // status by hand — dispatch → out for delivery → delivered — instead of the
  // Shipbubble webhook. Courier orders keep the existing mark-ready flow.
  const isSelf =
    newOrder?.shipping_option?.provider === "self" ||
    newOrder?.shipment?.provider === "self";

  const currentStatus =
    newOrder?.seller_activity?.[newOrder.seller_activity.length - 1]?.title?.toLowerCase();
  const isDelivered = currentStatus === "order delivered";
  const isOutForDelivery =
    currentStatus === "out for delivery" || currentStatus === "shipped";

  // Courier flow (unchanged): mark ready once paid.
  const showReadyButton =
    !isSelf &&
    (currentStatus === "payment confirmed" ||
      currentStatus === "new order received");

  // Self flow: dispatch (before it's out for delivery), then confirm delivered.
  const canDispatch = isSelf && !isOutForDelivery && !isDelivered;
  const canConfirmDelivered = isSelf && isOutForDelivery;
  const dispatchContact = newOrder?.shipment?.provider_data?.[0];

  // Re-open the dispatch sheet pre-filled with the saved contact so the seller
  // can correct it after dispatching. Reuses markSelfOutForDelivery, which
  // updates the shipment's dispatch details (the backend skips the status/activity
  // change on an edit).
  const openDispatchEdit = () => {
    setDispatch({
      name: dispatchContact?.dispatch_name || "",
      phone: dispatchContact?.dispatch_phone || "",
      note: dispatchContact?.dispatch_note || "",
    });
    setDispatchOpen(true);
  };

  const handleDispatchSubmit = async () => {
    if (!newOrder?.id || isMarkingReady) return;
    setIsMarkingReady(true);
    try {
      await markSelfOutForDelivery(newOrder.id, dispatch);
      setDispatchOpen(false);
      await getSellerOrderById(newOrder.id);
    } catch {
      // error toast surfaced by the store
    } finally {
      setIsMarkingReady(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!newOrder?.id || isMarkingReady) return;
    setIsMarkingReady(true);
    try {
      await markSelfDelivered(newOrder.id);
      await getSellerOrderById(newOrder.id);
    } catch {
      // error toast surfaced by the store
    } finally {
      setIsMarkingReady(false);
    }
  };

  return (
    <PageShell
      header={
        <Header
          showBack
          customText={`Order #${newOrder?.order?.invoice}`}
          onBackClick={() => router.push("/dashboard/orders")}
          showEmer
        />
      }
      footerAction={
        canConfirmDelivered ? (
          <Button
            onClick={handleMarkDelivered}
            loading={isMarkingReady}
            loadingText="Updating...">
            Mark as delivered
          </Button>
        ) : canDispatch ? (
          <Button onClick={() => setDispatchOpen(true)}>
            Mark out for delivery
          </Button>
        ) : showReadyButton ? (
          <Button
            onClick={async () => {
              if (newOrder?.id && !isMarkingReady) {
                setIsMarkingReady(true);
                try {
                  await markOrderReady(newOrder.id);
                  // Wait a bit to show the success message before navigating
                  setTimeout(() => {
                    router.push(`/dashboard/orders`);
                  }, 1500);
                } catch (error) {
                  console.error("Failed to mark order as ready:", error);
                  setIsMarkingReady(false);
                }
              }
            }}
            loading={isMarkingReady}
            loadingText="Updating...">
            Order is ready for pickup
          </Button>
        ) : undefined
      }>
        <div className="w-full">
          {/* Status of rider */}
          <div
            className={
              status
                ? "relative border border-ink-10 rounded-card px-4 pb-3 pt-4 gap-3 w-full"
                : "relative border border-ink-10 rounded-card px-4 pb-3 pt-4 gap-3 h-[204px] w-full overflow-hidden"
            }>
            <div className="w-full">
              <ActivityTop
                title={newOrder ? deriveSellerStatus(newOrder) : ""}
                date={
                  newOrder?.seller_activity
                    ? newOrder.seller_activity[
                      newOrder.seller_activity.length - 1
                    ].time
                    : ""
                }
              />
              <ProgressBar pick={pick} />
            </div>
            <div className="w-full">
              {newOrder?.seller_activity &&
                activityOrder.map((item: any) => (
                  <ActivityCard
                    key={item.title}
                    item={item}
                    status={activityOrder[0].title === item.title}
                  />
                ))}
            </div>
            {status ? (
              <div
                onClick={() => setStatus(!status)}
                className="flex justify-center items-center mt-2 text-brand font-medium text-body-sm">
                Collapse timeline{" "}
                <ChevronUp size={16} />
              </div>
            ) : (
              <>
                <div className="absolute bottom-0 left-0 right-0 h-[60px] bg-gradient-to-t from-white via-white to-transparent" />
                <div
                  onClick={() => setStatus(!status)}
                  className="flex justify-center items-center text-brand font-medium text-body-sm w-full absolute bottom-3 left-0 right-0 h-[40px]">
                  View full timeline{" "}
                  <ChevronDown size={16} />
                </div>
              </>
            )}
          </div>
          {/* Dispatch contact (self-delivery, once out for delivery) */}
          {isSelf &&
            (dispatchContact?.dispatch_name ||
              dispatchContact?.dispatch_phone ||
              dispatchContact?.dispatch_note) && (
              <div className="mt-4">
                <DispatchContactCard
                  name={dispatchContact?.dispatch_name}
                  phone={dispatchContact?.dispatch_phone}
                  note={dispatchContact?.dispatch_note}
                  onEdit={canConfirmDelivered ? openDispatchEdit : undefined}
                />
              </div>
            )}
          {/* items */}
          {newOrder && <Cards order={newOrder} buyerInfo={buyerInfo} />}
          <div className="flex flex-col gap-3 pt-4 pb-6">
            <div className="flex items-start gap-2">
              <div className="mt-1">
                <FaLocationDot size={20} className="text-ink-90" />
              </div>
              <div className="flex flex-col">
                <p className="font-normal text-caption text-ink-60">
                  shipping to
                </p>
                <p className="font-medium text-ink-90 text-body-sm">
                  {newOrder?.shipment?.provider_data?.[0]?.ship_to?.name
                    ? `${newOrder.shipment.provider_data[0].ship_to.name}`
                    : newOrder?.order?.shipping_profile?.shipping_user
                    ? `${newOrder.order.shipping_profile.shipping_user.firstname} ${newOrder.order.shipping_profile.shipping_user.lastname}`
                    : "Customer"}
                </p>
                <p className="font-medium text-ink-90 text-body-sm">
                  {newOrder?.shipment?.provider_data?.[0]?.ship_to?.address
                    ? `${newOrder.shipment.provider_data[0].ship_to.address}`
                    : newOrder?.order?.shipping_profile
                    ? `${newOrder.order.shipping_profile.street}, ${newOrder.order.shipping_profile.town}, ${newOrder.order.shipping_profile.state}`
                    : "Delivery Address"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={20} className="text-ink-90 flex-shrink-0" />

              <div className="flex flex-col">
                <p className="font-normal text-caption  text-ink-60">
                  Estimated delivery:
                </p>
                <p className="font-medium text-body-sm">
                  {newOrder?.shipping_option?.delivery_days || "N/A"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DeliveryTruck size={20} className="text-ink-90 flex-shrink-0" />

              <div className="flex flex-col">
                <p className="font-normal text-caption  text-ink-60">
                  Shipping method:
                </p>
                <p className="font-medium text-body-sm">
                  {newOrder?.shipping_option?.delivery_type}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 py-4">
            <p className="text-ink-60 text-body-sm">
              Order ID:{" "}
              <span className="font-medium text-ink-90">
                {newOrder?.order.invoice}
              </span>{" "}
            </p>
            <p className="text-ink-60 text-body-sm">
              Date placed:{" "}
              <span className="font-medium text-ink-90">
                {newOrder?.created_at &&
                  formatDate(new Date(newOrder?.created_at))}
              </span>{" "}
            </p>
            <p className="text-ink-60 text-body-sm">
              payment method:{" "}
              <span className="font-medium text-ink-90">
                Credit card via Paystack
              </span>{" "}
            </p>
          </div>
        </div>

        {/* Dispatch-contact sheet (self-delivery: "out for delivery" step) */}
        <Dialog
          isOpen={dispatchOpen}
          onClose={() => setDispatchOpen(false)}
          ariaLabel="Mark out for delivery">
          <div className="space-y-4">
            <div>
              <p className="text-h2 font-medium text-ink-90">
                {isOutForDelivery ? "Edit delivery contact" : "Out for delivery"}
              </p>
              <p className="text-body-sm text-ink-60 mt-1">
                Add a dispatch contact so the buyer can reach whoever is
                delivering. Optional, but it builds trust.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-caption text-ink-60 mb-1.5 block">
                  Dispatch name
                </label>
                <InputField
                  type="text"
                  name="dispatch_name"
                  value={dispatch.name}
                  onChange={(e) =>
                    setDispatch((d) => ({ ...d, name: e.target.value }))
                  }
                  placeholder="e.g. Musa (rider)"
                />
              </div>
              <div>
                <label className="text-caption text-ink-60 mb-1.5 block">
                  Phone number
                </label>
                <InputField
                  type="tel"
                  name="dispatch_phone"
                  value={dispatch.phone}
                  onChange={(e) =>
                    setDispatch((d) => ({ ...d, phone: e.target.value }))
                  }
                  placeholder="e.g. 0801 234 5678"
                  inputMode="tel"
                />
              </div>
              <div>
                <label className="text-caption text-ink-60 mb-1.5 block">
                  Note (optional)
                </label>
                <InputField
                  type="text"
                  name="dispatch_note"
                  value={dispatch.note}
                  onChange={(e) =>
                    setDispatch((d) => ({ ...d, note: e.target.value }))
                  }
                  placeholder="e.g. Arriving before 5pm"
                />
              </div>
            </div>
            <Button
              onClick={handleDispatchSubmit}
              loading={isMarkingReady}
              loadingText="Updating...">
              {isOutForDelivery ? "Save changes" : "Confirm out for delivery"}
            </Button>
          </div>
        </Dialog>
    </PageShell>
  );
};

export default Order;
