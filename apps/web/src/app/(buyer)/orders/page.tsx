/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, { ReactNode, useEffect, useState } from "react";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@/design-system/common/Header";
import Dialog from "@vibaar/ui/common/Dialog";
import { useRouter } from "next/navigation";
import useOrderStore from "@/store/orderStore";
import { formatCurrency, getMobileCompatibleImageUrl } from "@/lib/utils";
import useBusinessStore from "@/store/businessStore";
import useProductStore from "@/store/productStore";
import EmptyState from "@vibaar/ui/common/EmptyState";
import Button from "@vibaar/ui/common/Button";
import NavigationTabs from "@vibaar/ui/common/NavigationTabs";
import useAuthStore from "@/store/authStore";
import VendorNav from "@/features/storefront/VendorNav";
import H1 from "@vibaar/ui/common/Typography";
import Image from "next/image";
import useShippingStore from "@/store/shippingStore";
import InputField from "@vibaar/ui/common/InputField";
import { OrderDatas } from "@/lib/order";
import { formatTimestamp } from "@/lib/converter";
import { ProductData } from "@/lib/types";

const OrderCard = ({
  children,
  text,
}: {
  children: ReactNode;
  text: string;
}) => {
  return (
    <div className="flex justify-between items-center">
      <p className="text-caption font-normal text-ink-60">{text}</p>
      {children}
    </div>
  );
};

const RatingComponent = ({
  action,
  rate,
}: {
  action: () => void;
  rate: number;
}) => {
  return (
    <div className="flex justify-between items-center">
      <p className="text-ink-60 font-medium text-body-sm leading-[12px]">
        Rate this item
      </p>

      <div className="flex gap-1 items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            onClick={action}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={star <= rate ? "var(--warning)" : "var(--ink-5)"} // Dynamic fill color
            stroke={star <= rate ? "var(--ink-5)" : "var(--warning)"} // Dynamic stroke color
            strokeWidth={2}
            className="w-6 h-6 cursor-pointer">
            <path
              d="M12 2.75l3.09 6.26 6.91 1-5 4.87 1.18 6.88L12 17.77l-6.18 3.25 1.18-6.88-5-4.87 6.91-1L12 2.75z"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        ))}
      </div>
    </div>
  );
};

const OrderAgainButton = ({ action }: { action: () => void }) => {
  return (
    <button
      onClick={action}
      className=" border border-brandDeep bg-white text-brandDeep text-body font-normal rounded-full w-full p-1 justify-center items-center">
      Order again
    </button>
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
      <p className="text-body-sm font-medium text-ink-90 leading-[12px]">
        Your review
      </p>
      <div className="flex space-x-3 bg-white rounded-field p-2">
        <div className="bg-warning/10 p-2 rounded-field gap-1 justify-center items-center flex font-medium text-body-sm text-ink-90">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={"var(--warning)"} // Dynamic fill color
            stroke={"var(--warning)"} // Dynamic stroke color
            strokeWidth={2}
            className="w-[14px] h-[14px] cursor-pointer">
            <path
              d="M12 2.75l3.09 6.26 6.91 1-5 4.87 1.18 6.88L12 17.77l-6.18 3.25 1.18-6.88-5-4.87 6.91-1L12 2.75z"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
          {rate}
        </div>
        <div className="flex-1">
          <p className="text-ink-60 font-normal text-body-sm">
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
  // Comprehensive status mapping handling all backend variations and Figma specs
  const picker: any = {
    // Blue statuses (initial states)
    "order placed": { primary: "#155DFC", secondary: "#DBEAFE" },
    "new order received": { primary: "#155DFC", secondary: "#DBEAFE" },
    
    // Teal/Cyan status (payment)
    "payment confirmed": { primary: "#02A29E", secondary: "#E9FFFE" },
    
    // Yellow statuses (processing)
    "processing for shipping": { primary: "#FFCC00", secondary: "#FFFAE5" },
    "shipping started": { primary: "#FFCC00", secondary: "#FFFAE5" }, // Backend variation
    "shipping confirmed": { primary: "#FFCC00", secondary: "#FFFAE5" }, // Backend variation
    "shipment created & assigned to a courier": { primary: "#FFCC00", secondary: "#FFFAE5" },
    "ready for shipping": { primary: "#FFCC00", secondary: "#FFFAE5" }, // Backend variation
    
    // Orange status (rider movement)
    "rider on the way to vendor": { primary: "#FE9A00", secondary: "#FEF3C6" },
    
    // Purple status (in transit)
    "order picked up & in transit": { primary: "#AD46FF", secondary: "#F3E8FF" },
    "order picked up": { primary: "#AD46FF", secondary: "#F3E8FF" }, // Backend variation
    "order in transit": { primary: "#AD46FF", secondary: "#F3E8FF" }, // Backend variation
    "package picked up": { primary: "#AD46FF", secondary: "#F3E8FF" }, // Backend variation
    
    // Blue status (delivery)
    "out for delivery": { primary: "#2B7FFF", secondary: "#DBEAFE" },
    
    // Green status (completed)
    "order delivered": { primary: "#00C950", secondary: "#EAFFF6" },
    
    // Red statuses (cancelled/failed)
    "order cancelled": { primary: "#FB2C36", secondary: "#FFE2E2" },
    "delivery attempt failed": { primary: "#FB2C36", secondary: "#FFE2E2" },
    "order returned to vendor": { primary: "#FB2C36", secondary: "#FFE2E2" },
  };
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
            src="/Logo (6).svg"
            className="max-w-[160px] w-full h-auto mx-auto"
          />
          <div className="text-center mt-5 flex flex-col gap-2">
            <H1 className="text-h2 mb-1 leading-[22px]">
              Sign in to your account
            </H1>
            <p className="text-ink-60 mt-3 max-w-[320px]">
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
          <p className="text-body mt-3 text-center text-ink-60">
            Don’t have an account?{" "}
            <span
              className="text-brandDeep ml-2 cursor-pointer"
              onClick={() => router.push("/signup")}>
              Sign up
            </span>
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
            className="text-body-sm !px-5 py-1 !w-[max-content]">
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
          // Debug logging to identify status mismatch
          if (!picker[checker]) {
            console.log("⚠️ No matching status for:", checker, "Order ID:", order.id);
            console.log("Available statuses:", Object.keys(picker));
            console.log("Buyer activity:", order.buyer_activity);
          }
          const pick = picker[checker] || {
            primary: "#155DFC",  // Default to "order placed" blue instead of black
            secondary: "#DBEAFE",
          };
          //(pick);
          const productName = products.find((it) => it.id === order.product_id);
          // This user's own review for the product — drives the before/after
          // rating states (not the product's aggregate).
          const myReview = productName?.product_rating?.find(
            (r: { user_id?: string }) => r.user_id === user?.id
          );
          return (
            <div key={order.id} className="mb-2.5 space-y-4">
              <div className="bg-ink-3 p-[2px] rounded-field">
                <div
                  onClick={() => {
                    setNewOrderItem(order);
                    router.push(`/orders/${order.id}`);
                  }}
                  className="flex space-x-3 bg-white rounded-field p-2 cursor-pointer">
                  <img
                    src={
                      productName?.image
                        ? getMobileCompatibleImageUrl(productName.image[0])
                        : "/PRODUCT IMAGE (2).png"
                    }
                    className="w-[60px] h-[60px] object-cover rounded-field border"
                    alt={productName?.title ? productName.title : ""}
                  />
                  <div className="flex-1 flex-col flex justify-between">
                    <p className="text-ink-90 font-normal text-body-sm">
                      {productName?.title ? productName.title : ""}
                    </p>
                    {/* <div className="flex text-ink-40 text-body-sm font-medium space-x-4">
                      <p>Color: Red</p>
                      <p>Size: {productName?.title ? productName. : ""}</p>
                    </div> */}
                    <div className="flex text-ink-60 text-body-sm font-medium space-x-4">
                      <p> {formatCurrency(order.price)}</p>
                      <p className="text-ink-90">x {order.quantity}</p>
                    </div>
                  </div>
                </div>

                {order.buyer_activity &&
                  order.buyer_activity[
                    order.buyer_activity.length - 1
                  ].title.toLowerCase() == "order delivered" && (
                    <div className="flex mt-1 flex-col bg-white rounded-field p-2 space-y-2">
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
                  <OrderCard
                    text={formatTimestamp(
                      order.buyer_activity
                        ? order.buyer_activity[order.buyer_activity.length - 1]
                            .time
                        : ""
                    )}>
                    <div
                      className={`justify-center items-center flex text-center font-normal text-caption leading-[10px] px-2 py-[3px] rounded-full border`}
                      style={{
                        color: pick.primary,
                        borderColor: pick.primary,
                        backgroundColor: pick.secondary,
                      }}>
                      {order.buyer_activity && order.buyer_activity.length > 0
                        ? order.buyer_activity[order.buyer_activity.length - 1]
                            .title
                        : "Order Placed"}
                    </div>
                  </OrderCard>
                  <OrderCard text="Order ID:">
                    <p className="text-caption text-ink-90 font-medium leading-[10px]">
                      {order.order.invoice}
                    </p>
                  </OrderCard>
                  {order.buyer_activity &&
                    order.buyer_activity[
                      order.buyer_activity.length - 1
                    ].title.toLowerCase() !== "order delivered" && (
                      <OrderCard text="Arrives by:">
                        <p className="text-caption text-ink-90 font-medium leading-[10px]">
                          ~ {order.shipping_option.delivery_days}
                        </p>
                      </OrderCard>
                    )}
                </div>
              </div>
            </div>
          );
        })
      )}
      <VendorNav />
    </div>
  );

  return (
    <PageShell
      header={
        <Header
          showBack
          customText="Cart and Orders"
          showMenu
          onBackClick={() => router.back()}
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

          <div className="w-full flex space-x-3 border-ink-10 border rounded-field p-2">
            <img
              src={
                selected.item?.image
                  ? selected.item.image[0]
                  : "/PRODUCT IMAGE (2).png"
              }
              className="w-[60px] h-[60px] object-cover rounded-field border border-ink-10"
              alt={selected.item?.title}
            />
            <div className="flex-1 flex-col flex justify-between">
              <p className="text-ink-90 font-normal text-body-sm">
                {selected.item?.title as string}
              </p>
              {selected.product?.variant_selection && (
                <p className="text-ink-40 text-body-sm font-medium">
                  {selected.product.variant_selection}
                </p>
              )}
              <div className="flex text-ink-60 text-body-sm font-medium space-x-4">
                <p>{formatCurrency(selected.product?.price || 0)}</p>
                <p className="text-ink-90">x{selected.product?.quantity}</p>
              </div>
            </div>
          </div>

          {/* Star Rating */}
          <div className="flex gap-2 items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                onClick={() => setRating(star)}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={rating >= star ? "var(--warning)" : "var(--ink-5)"}
                stroke={rating >= star ? "var(--warning)" : "var(--ink-20)"}
                strokeWidth={1.5}
                className="w-10 h-10 cursor-pointer">
                <path
                  d="M12 2.75l3.09 6.26 6.91 1-5 4.87 1.18 6.88L12 17.77l-6.18 3.25 1.18-6.88-5-4.87 6.91-1L12 2.75z"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            ))}
          </div>

          {/* Feedback + chips (grouped) */}
          <div className="space-y-2">
            <p className="text-body text-ink-90">
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
                <button
                  key={chip.value}
                  onClick={() => setRating(chip.value)}
                  className={`px-3 py-1 rounded-full border text-caption font-medium cursor-pointer transition-colors duration-300 ${
                    rating === chip.value
                      ? "bg-warning border-warning text-white"
                      : "bg-ink-5 border-ink-10 text-ink-60"
                  }`}>
                  {chip.label}
                </button>
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
