/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, { ReactNode, useEffect, useState } from "react";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import IconButton from "@vibaar/ui/common/IconButton";
import Dialog from "@vibaar/ui/common/Dialog";
import { useRouter } from "next/navigation";
import StatusBadge from "@/features/orders/StatusBadge";
import StarRating from "@/features/orders/StarRating";
import OrderLineItem from "@/features/orders/OrderLineItem";
import DetailRow from "@vibaar/ui/common/DetailRow";
import useOrderStore from "@/store/orderStore";
import { formatCurrency, getMobileCompatibleImageUrl } from "@/lib/utils";
import useBusinessStore from "@/store/businessStore";
import useProductStore from "@/store/productStore";
import EmptyState from "@vibaar/ui/common/EmptyState";
import ChipToggle from "@vibaar/ui/common/ChipToggle";
import Button from "@vibaar/ui/common/Button";
import NavigationTabs from "@vibaar/ui/common/NavigationTabs";
import useAuthStore from "@/store/authStore";
import H1 from "@vibaar/ui/common/Typography";
import Image from "next/image";
import useShippingStore from "@/store/shippingStore";
import InputField from "@vibaar/ui/common/InputField";
import { OrderDatas } from "@/lib/order";
import { formatTimestamp } from "@/lib/converter";
import { ProductData } from "@/lib/types";
import { FaStar } from "@vibaar/ui/icons";

const RatingComponent = ({
  action,
  rate,
}: {
  action: () => void;
  rate: number;
}) => {
  return (
    <div className="flex justify-between items-center">
      <p className="text-foreground-secondary font-medium text-body-sm leading-[12px]">
        Rate this item
      </p>

      <StarRating value={rate} onRate={action} />
    </div>
  );
};

const OrderAgainButton = ({ action }: { action: () => void }) => {
  return (
    <Button onClick={action} variant="bordered" size="sm" fullWidth={false} className="w-full">
      Order again
    </Button>
  );
};

const ReviewIcon = ({
  rate,
  comment,
}: {
  rate: number;
  comment?: string;
}) => {
  return (
    <div>
      <p className="text-body-sm font-medium text-foreground-primary leading-[12px]">
        Your review
      </p>
      <div className="flex space-x-3 bg-surface rounded-field p-2">
        <div className="bg-warning-surface p-2 rounded-field gap-1 justify-center items-center flex font-medium text-body-sm text-foreground-primary">
          <FaStar size={14} className="text-brandDeep" aria-hidden="true" />
          {rate}
        </div>
        <div className="flex-1">
          <p className="text-foreground-secondary font-normal text-body-sm">
            {comment || "No comment"}
          </p>
        </div>
      </div>
    </div>
  );
};

const Page = () => {
  const router = useRouter();
  const tabs = [
    { label: "Cart", path: "/cart" },
    { label: "Order History", path: "/orders" },
  ];
  const {
    newOrders,
    fetchOrderItems,
    setNewOrderItem,
    fetchAllOrders,
    fetchAllSellerOrders,
    fetchGuestOrders,
  } = useOrderStore();
  const { guestId } = useShippingStore();
  const { fetchStores, stores } = useBusinessStore((state) => state);
  const { rateProduct, products } = useProductStore();
  const { user } = useAuthStore();
  const [show, setShow] = useState(false);
  const [isNavigatingToSignin, setIsNavigatingToSignin] = useState(false);
  const [selected, setSelected] = useState<{
    product_id: string;
    business_id: string;
    product: OrderDatas | null;
    item: ProductData | null;
  }>({
    product_id: "",
    business_id: "",
    product: null,
    item: null,
  });
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");

  const handleRatingSubmit = async () => {
    const reviewData = {
      user_id: user?.id || "",
      product_id: selected.product_id,
      comment: comment,
      rate: rating,
    };
    if (user?.id && selected.product_id) {
      await rateProduct(reviewData);
    }
    setShow(false);
    setRating(0);
    setComment("");
  };

  const handleSigninNavigation = async () => {
    if (isNavigatingToSignin) return;
    setIsNavigatingToSignin(true);
    setTimeout(() => {
      router.push("/signin");
    }, 100);
  };
  console.log(newOrders);
  // Order-status colour lives in ONE place: features/orders/orderStatus.
  // This screen used to carry its own 20-entry map of raw hex primary/secondary
  // pairs, applied through an inline style — 33 of this file's drift findings.
  // StatusBadge reads the shared config, so the buyer pill and the seller pill
  // can no longer disagree.

  useEffect(() => {
    console.log("🔍 Orders page authentication debug:", {
      user: user ? { id: user.id, email: user.email, isAuthenticated: !!user } : null,
      guestId,
      hasToken: document.cookie.includes('accessToken'),
      userExists: !!user
    });
    
    fetchStores();

    if (user) {
      console.log("✅ User authenticated - fetching user's purchase history (Order History)");
      fetchAllOrders(); // FIXED: Use fetchAllOrders for user's purchase history, not fetchAllSellerOrders
      fetchOrderItems();
    } else {
      console.log("⚠️ User not authenticated - fetching guest orders with guestId:", guestId);
      fetchGuestOrders(guestId as string);
    }
  }, []);

  const Orders = () => (
    <div className="py-4">
      {!user ? (
        <div className="h-[90%] flex flex-col justify-center items-center gap-5">
          <Image
            alt="Vibaar"
            width={0}
            height={0}
            src="/brand/logo-black.svg"
            className="max-w-[160px] w-full h-auto mx-auto"
          />
          <div className="text-center mt-5 flex flex-col gap-2">
            <H1 className="text-h2 mb-1 leading-[22px]">
              Sign in to your account
            </H1>
            <p className="text-foreground-secondary mt-3 max-w-[320px]">
              To continue enjoying Vibaar’s features you need to sign in to
              your account.
            </p>
          </div>

          <Button 
            onClick={handleSigninNavigation}
            loading={isNavigatingToSignin}
            loadingText="Loading sign in..."
            className="mt-4"
          >
            Sign in
          </Button>
          <p className="text-body mt-3 text-center text-foreground-secondary">
            Don’t have an account?{" "}
            <button type="button"
              className="text-left text-brandDeep ml-2 cursor-pointer"
              onClick={() => router.push("/signup")}>
              Sign up
            </button>
          </p>
        </div>
      ) : newOrders.length === 0 ? (
        <EmptyState
          title="You have no orders yet."
          subtitle="Once you have any orders they will appear here."
          image="/images/cart/empty_order_state.svg">
          <Button
            variant="bordered"
            type="button"
            onClick={() => router.push("/shop")}
            size="sm" fullWidth={false}>
            Explore vendors
          </Button>
        </EmptyState>
      ) : (
        newOrders.map((order) => {
          const checker = order.buyer_activity && order.buyer_activity.length > 0
            ? order.buyer_activity[
                order.buyer_activity.length - 1
              ].title.toLowerCase()
            : "order placed"; // Default to "order placed" if no activities
          const productName = products.find((it) => it.id === order.product_id);
          // This user's own review for the product — drives the before/after
          // rating states (not the product's aggregate).
          const myReview = productName?.product_rating?.find(
            (r: { user_id?: string }) => r.user_id === user?.id
          );
          return (
            <div key={order.id} className="mb-2.5 space-y-4">
              <div className="bg-surface-subtle p-[2px] rounded-field">
                <div
                  onClick={() => {
                    setNewOrderItem(order);
                    router.push(`/orders/${order.id}`);
                  }}
                  className="flex space-x-3 bg-surface rounded-field p-2 cursor-pointer">
                  <OrderLineItem
                    image={
                      productName?.image
                        ? getMobileCompatibleImageUrl(productName.image[0])
                        : undefined
                    }
                    name={productName?.title ?? ""}
                    price={order.price}
                    quantity={order.quantity}
                  />
                </div>

                {order.buyer_activity &&
                  order.buyer_activity[
                    order.buyer_activity.length - 1
                  ].title.toLowerCase() == "order delivered" && (
                    <div className="flex mt-1 flex-col bg-surface rounded-field p-2 space-y-2">
                      {myReview ? (
                        <ReviewIcon
                          rate={myReview.rate}
                          comment={myReview.comment}
                        />
                      ) : (
                        <RatingComponent
                          rate={0}
                          action={() => {
                            setSelected({
                              business_id: order.business_id,
                              product_id: order.product_id,
                              product: order,
                              item: productName ? productName : {},
                            });
                            setShow(!show);
                          }}
                        />
                      )}
                      <OrderAgainButton action={() => {}} />
                    </div>
                  )}

                <div className="px-2 pb-2 pt-2 space-y-1">
                  <DetailRow
                    label={formatTimestamp(
                      order.buyer_activity
                        ? order.buyer_activity[order.buyer_activity.length - 1]
                            .time
                        : ""
                    )}>
                    <StatusBadge
                      status={
                        order.buyer_activity && order.buyer_activity.length > 0
                          ? order.buyer_activity[order.buyer_activity.length - 1].title
                          : "Order Placed"
                      }
                    />
                  </DetailRow>
                  <DetailRow label="Order ID:">
                    <p className="text-caption text-foreground-primary font-medium leading-[10px]">
                      {order.order.invoice}
                    </p>
                  </DetailRow>
                  {order.buyer_activity &&
                    order.buyer_activity[
                      order.buyer_activity.length - 1
                    ].title.toLowerCase() !== "order delivered" && (
                      <DetailRow label="Arrives by:">
                        <p className="text-caption text-foreground-primary font-medium leading-[10px]">
                          ~ {order.shipping_option.delivery_days}
                        </p>
                      </DetailRow>
                    )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <PageShell
      header={
        <Header
          onBack={() => router.back()}
          title="Cart and Orders"
        />
      }>
      <div className="w-full">
        <NavigationTabs tabs={tabs} />
        <Orders key="orders" />
      </div>

      <Dialog isOpen={show} onClose={() => setShow(false)} ariaLabel="Rate your order">
        {/* One consistent vertical rhythm — no per-element mb/mt drift. */}
        <div className="space-y-4">
          <p className="text-h2">
            How was your order from{" "}
            <span className="font-medium">
              {stores?.find((store) => store?.id === selected.business_id)?.name}
            </span>
          </p>

          <div className="w-full flex space-x-3 border-outline border rounded-field p-2">
            <img
              src={
                selected.item?.image
                  ? selected.item.image[0]
                  : "/images/product-placeholder.svg"
              }
              className="w-[60px] h-[60px] object-cover rounded-field border border-outline"
              alt={selected.item?.title}
            />
            <div className="flex-1 flex-col flex justify-between">
              <p className="text-foreground-primary font-normal text-body-sm">
                {selected.item?.title as string}
              </p>
              {selected.product?.variant_selection && (
                <p className="text-foreground-muted text-body-sm font-medium">
                  {selected.product.variant_selection}
                </p>
              )}
              <div className="flex text-foreground-secondary text-body-sm font-medium space-x-4">
                <p>{formatCurrency(selected.product?.price || 0)}</p>
                <p className="text-foreground-primary">x{selected.product?.quantity}</p>
              </div>
            </div>
          </div>

          {/* Star Rating */}
          <StarRating value={rating} onRate={setRating} size="lg" />

          {/* Feedback + chips (grouped) */}
          <div className="space-y-2">
            <p className="text-body text-foreground-primary">
              You rated the product {rating} star(s). Tell us more about it:
            </p>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: "Good", value: 1 },
                { label: "Satisfied", value: 2 },
                { label: "Good Quality", value: 3 },
                { label: "Excellent", value: 4 },
                { label: "Outstanding", value: 5 },
              ].map((chip) => (
                <ChipToggle
                  key={chip.value}
                  selected={rating === chip.value}
                  onClick={() => setRating(chip.value)}>
                  {chip.label}
                </ChipToggle>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <InputField
            type="textarea"
            name="description"
            placeholder="Tell us about your experience..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="h-[68px] w-full border rounded-field px-3 py-2"
          />

          {/* Submit Button */}
          <Button onClick={handleRatingSubmit}>Submit review</Button>
        </div>
      </Dialog>
    </PageShell>
  );
};

export default Page;
