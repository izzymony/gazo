/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useState } from "react";
import OrderLineItem from "@/features/orders/OrderLineItem";
import DetailRow from "@vibaar/ui/common/DetailRow";
import { PiCube, CircleCheck, ChevronUp, ChevronDown } from "@vibaar/ui/icons";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import Dialog from "@vibaar/ui/common/Dialog";
import useOrderStore from "@/store/orderStore";
import { useParams } from "next/navigation";
import Loader from "@vibaar/ui/common/Loader";
import { useRouter } from "next/navigation";
import {
  formatCurrency,
  formatDate,
  // formatTimeAgo,
  // getProductDetails,
} from "@/lib/utils";
import useProductStore from "@/store/productStore";
import useBusinessStore from "@/store/businessStore";
import InputField from "@vibaar/ui/common/InputField";
import Button from "@vibaar/ui/common/Button";
import useAuthStore from "@/store/authStore";
// import Image from "next/image";
import useShippingStore from "@/store/shippingStore";
import { Emergency, Shield } from "@vibaar/ui/svg";
import { OrderStatusIcon } from "@/features/orders/orderStatus";
import DispatchContactCard from "@/features/orders/DispatchContactCard";
import { formatTimeAgos, formatTimestamp } from "@/lib/converter";
import { OrderDatas } from "@/lib/order";
import { ProductData } from "@/lib/types";
import Badge from "@vibaar/ui/common/Badge";
import { supportWhatsAppUrl } from "@/lib/support";

const ActivityTop = ({ title, date }: { title: string; date: string }) => {
  return (
    <div className="flex gap-3">
      <OrderStatusIcon status={title} />
      <div className="flex flex-col justify-between">
        <p className="text-foreground-secondary font-normal text-body-sm">Status:</p>
        <p className="text-foreground-primary font-medium text-h1">{title}</p>
        <p className="text-foreground-secondary font-normal text-body-sm">
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
              ? "text-success-foreground"
              : "text-brandDeep"
            }`
            : "text-foreground-secondary"
            }`}>
          {title}
        </p>
        <p className="text-caption font-normal text-foreground-muted">
          {formatTimeAgos(time)}
        </p>
      </div>
      <p className="text-caption font-normal text-foreground-muted">{details}</p>
    </div>
  );
};

const Check = () => <CircleCheck size={16} className="text-foreground-muted" />;

const Indicators = ({ show = false }: { show: boolean }) => {
  return (
    <div className="flex flex-col items-center">
      <div
        className={
          !show
            ? "h-[10px] border border-outline-strong"
            : "h-[10px] border border-brandDeep"
        }
      />
      {show ? (
        <div className="w-4 h-4 rounded-full border border-brandDeep bg-brand/10 flex justify-center items-center">
          <div className="w-[10px] h-[10px] bg-brand rounded-full" />
        </div>
      ) : (
        <div className="w-4 h-4 rounded-full flex justify-center items-center">
          <Check />
        </div>
      )}
      <div className="flex-1 border border-outline-strong" />
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

const Cards = ({
  order,
  products,
}: {
  order: OrderDatas;
  products: ProductData[];
}) => {
  const productName = products.find((it) => it.id === order.product_id);
  return (
    <div className="mt-6 space-y-3">
      <div>
        <p className="flex gap-2 items-center text-body font-medium">
          <span>
            <PiCube />
          </span>{" "}
          items ({order.quantity})
        </p>
      </div>
      <div className="gap-3">
        <OrderLineItem bordered
          name={productName?.title as string}
          quantity={order.quantity}
          image={
            productName?.image ? productName.image[0] : "/PRODUCT IMAGE (2).png"
          }
          price={order.price}
          variant={order.variant_selection}
        />
      </div>
      <div className="border border-outline rounded-card p-3 gap-2 flex flex-col">
        <DetailRow
          label={`Subtotal: ${order.quantity} items`}
          value={formatCurrency(order.order?.sub_total || (order.price * order.quantity))}
        />
        <DetailRow label="Discount:" value={formatCurrency(
            productName?.original_price
              ? +productName?.original_price - +order.price
              : 0
          )} />
        <DetailRow label="Shipping:" value={formatCurrency(order.shipping_option?.price ? +order.shipping_option.price.slice(3) : 0)} />
        <DetailRow label={"Total:"} value={formatCurrency(order.order?.total || ((order.price * order.quantity) + (order.shipping_option?.price ? +order.shipping_option.price.slice(3) : 0)))} />
      </div>
    </div>
  );
};

const Shipping = ({
  singleShippingDetails,
  router,
}: {
  singleShippingDetails: any;
  router: any;
}) => {
  return (
    <div className="mt-4">
      <p className="mb-3 text-body-sm font-normal">Shipping profile</p>
      <div className="p-2 rounded-field border flex flex-col gap-2 text-body font-normal">
        <Badge tone="brand" size="md">Default</Badge>
        <p>
          {singleShippingDetails.shipping_user?.firstname +
            " " +
            singleShippingDetails.shipping_user?.lastname}
        </p>
        <p>{singleShippingDetails.shipping_user?.phone}</p>
        {/* <p>{singleShippingDetails.}</p> */}
        <p>{singleShippingDetails?.street}</p>
        <button
          onClick={() => {
            router.push("/cart/shipping-profile");
          }}
          type="button"
          className="w-full rounded-full py-2 border bg-surface text-brandDeep text-body font-medium mt-2">
          Change Shipping Details
        </button>
      </div>
    </div>
  );
};

const Bottom = () => {
  return (
    <div className="w-full mt-4 pb-3 flex justify-between items-center">
      <div className="flex text-foreground-primary font-medium text-body-sm items-center">
        <Shield /> Return policy
      </div>
      <div className="flex items-center text-foreground-secondary text-body-sm">
        Free return within{" "}
        <div className=" text-foreground-primary mx-1 font-medium text-body-sm">
          {" 24hrs "}
        </div>
        <Emergency />
      </div>
    </div>
  );
};

const Rating = ({
  handleStarClick,
  rating,
  rated,
}: {
  handleStarClick: (val: number) => void;
  rating: number;
  rated?: number | null;
}) => {
  const isRated = rated != null && rated > 0;
  return (
    <div className="mb-6 flex flex-col items-center justify-center py-4 w-full">
      <p className="text-h1 font-medium text-center mb-3">
        {isRated ? "Thanks for your rating!" : "How was your order?"}
      </p>
      <div className="flex gap-2 items-center mb-3">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = isRated ? (rated as number) >= star : rating >= star;
          return (
            <svg
              key={star}
              onClick={isRated ? undefined : () => handleStarClick(star)}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={filled ? "rgb(var(--warning-foreground-rgb))" : "rgb(var(--surface-muted-rgb))"}
              stroke="rgb(var(--warning-foreground-rgb))"
              strokeWidth={1.5}
              className={isRated ? "w-10 h-10" : "w-10 h-10 cursor-pointer"}>
              <path
                d="M12 2.75l3.09 6.26 6.91 1-5 4.87 1.18 6.88L12 17.77l-6.18 3.25 1.18-6.88-5-4.87 6.91-1L12 2.75z"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          );
        })}
      </div>

      <p className="text-body-sm font-medium text-center text-foreground-secondary mt-2">
        {isRated
          ? `You rated this order ${rated} star${
              (rated as number) > 1 ? "s" : ""
            }.`
          : "Tap on a star to give a rating."}
      </p>
    </div>
  );
};

const ProgressBar = ({ pick }: { pick: number }) => {
  return (
    <div className="w-full bg-surface-strong rounded-full h-1 my-3 flex justify-between overflow-hidden">
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

const Order = () => {
  const { isLoading, getOrderById, getGuestOrdersById, newOrder } =
    useOrderStore();
  const { rateProduct, products } = useProductStore();
  const { stores } = useBusinessStore();
  const { user } = useAuthStore();
  const { orderId } = useParams();
  const router = useRouter();
  const { singleShippingDetails, guestId } = useShippingStore();

  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [isModalOpen, setModalOpen] = useState<boolean>(false);
  const [status, setStatus] = useState(false);
  const handleStarClick = (star: number) => {
    setRating(star);
    setModalOpen(true);
  };

  const handleChipClick = (value: number) => {
    setRating(value);
  };

  const handleRatingSubmit = async () => {
    const reviewData = {
      user_id: user?.id || "",
      product_id: newOrder?.product_id || "",
      comment: comment,
      rate: rating,
    };
    if (user?.id && newOrder?.product_id) {
      await rateProduct(reviewData);
    }
    setModalOpen(false);
    setRating(0);
    setComment("");
  };

  useEffect(() => {
    if (user) {
      if (orderId) getOrderById(orderId as string);
    } else {
      if (orderId) getGuestOrdersById(guestId as string, orderId as string);
    }
    //(order)
  }, []);

  if (isLoading) {
    return <Loader />;
  }

  if (!newOrder) {
    return (
      <PageShell
        header={
          <Header
            onBack={() => router.back()}
            title="Order"
          />
        }>
        <div className="w-full flex flex-col items-center text-center mt-20">
          <p className="text-h2 font-medium mb-2">Order not found</p>
          <p className="text-foreground-secondary text-body-sm mb-6 max-w-[320px]">
            We couldn&apos;t load this order. It may still be processing, or the link
            may be incorrect.
          </p>
          <div className="w-full max-w-[320px]">
            <Button onClick={() => router.push("/orders")} fullWidth={false} className="w-full">
              Back to orders
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  const picker: any = {
    "order placed": 1,
    "payment confirmed": 2,
    "processing for shipping": 3,
    "shipping created & assigned to a courier": 4,
    "rider on the way to vendor": 5,
    "order picked up & in transit": 6,
    "out for delivery": 7,
    "order delivered": 8,
    "order cancelled": -1,
    "delivery attempt failed": -2,
    "order returned to vendor": -3,
  };

  const pick = newOrder?.buyer_activity
    ? picker[
    newOrder?.buyer_activity[
      newOrder.buyer_activity.length - 1
    ].title.toLowerCase()
    ]
    : 0;
  const activityOrder: any = [];
  if (newOrder?.buyer_activity) {
    for (let i = 0; i < newOrder?.buyer_activity?.length; i++) {
      activityOrder.unshift(newOrder.buyer_activity[i]);
    }
  }

  // Self-delivery dispatch contact (set by the seller at "out for delivery").
  const dispatchContact = newOrder?.shipment?.provider_data?.[0];

  // This user's rating for the ordered product — flips the prompt to a read-only
  // "already rated" state (and reflects a just-submitted rating, since
  // rateProduct updates product_rating locally).
  const ratedProduct = products.find((p) => p.id === newOrder?.product_id);
  const myRating =
    ratedProduct?.product_rating?.find(
      (r: { user_id?: string }) => r.user_id === user?.id
    )?.rate ?? null;

  return (
    <>
      <PageShell
        header={
          <Header
            onBack={() => router.push("/orders")}
            title={`Order #${newOrder?.order?.invoice}`}
            trailing={
              <a
                href={supportWhatsAppUrl(`Hi, I need help with order #${newOrder?.order?.invoice ?? ""}`)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Get help with this order"
                className="inline-flex items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandDeep/40">
                <Emergency />
              </a>
            }
          />
        }>
        <div className="h-full w-full">
          {/* Rating Prompt */}
          {newOrder?.buyer_activity &&
            newOrder.buyer_activity[newOrder.buyer_activity.length - 1]
              .title === "Order Delivered" && (
              <Rating
                handleStarClick={handleStarClick}
                rating={rating}
                rated={myRating}
              />
            )}
          {/* Status of rider */}
          <div>
            <div
              className={
                status
                  ? "relative border border-outline rounded-card px-4 pb-3 pt-4 gap-3 w-full"
                  : "relative border border-outline rounded-card px-4 pb-3 pt-4 gap-3 h-[204px] w-full overflow-hidden"
              }>
              <div className="w-full">
                <ActivityTop
                  title={
                    newOrder?.buyer_activity
                      ? newOrder.buyer_activity[
                        newOrder.buyer_activity.length - 1
                      ].title
                      : ""
                  }
                  date={
                    newOrder?.buyer_activity
                      ? newOrder.buyer_activity[
                        newOrder.buyer_activity.length - 1
                      ].time
                      : ""
                  }
                />
                <ProgressBar pick={pick} />
              </div>
              <div className="w-full">
                {newOrder?.buyer_activity &&
                  activityOrder.map((item: any) => (
                    <ActivityCard
                      key={item.title}
                      item={item}
                      status={activityOrder[0].title === item.title}
                    />
                  ))}
              </div>
              {status ? (
                <button type="button"
                  onClick={() => setStatus(!status)}
                  className="text-left flex justify-center items-center mt-2 text-brandDeep font-medium text-body-sm">
                  Collapse timeline{" "}
                  <ChevronUp size={16} className="text-brandDeep" />
                </button>
              ) : (
                <>
                  <div className="absolute bottom-0 left-0 right-0 h-[60px] bg-gradient-to-t from-white via-white to-transparent" />
                  <button type="button"
                    onClick={() => setStatus(!status)}
                    className="text-left flex justify-center items-center text-brandDeep font-medium text-body-sm w-full absolute bottom-3 left-0 right-0 h-[40px]">
                    View full timeline{" "}
                    <ChevronDown size={16} className="text-brandDeep" />
                  </button>
                </>
              )}
            </div>
          </div>
          {/* Dispatch contact (self-delivery) */}
          {(dispatchContact?.dispatch_name ||
            dispatchContact?.dispatch_phone ||
            dispatchContact?.dispatch_note) && (
            <div className="mt-4">
              <DispatchContactCard
                name={dispatchContact?.dispatch_name}
                phone={dispatchContact?.dispatch_phone}
                note={dispatchContact?.dispatch_note}
                eta={newOrder?.shipping_option?.delivery_days}
              />
            </div>
          )}
          {/* items */}
          {newOrder && <Cards order={newOrder} products={products} />}
          <div className="w-full border-y pt-1 pb-4 mt-4 lg:mt-0">
            <Shipping
              singleShippingDetails={newOrder?.order?.shipping_profile || singleShippingDetails}
              router={router}
            />
            <Bottom />
          </div>
          {/* Order Details Section */}
          <div className="flex flex-col gap-3 py-4">
            <p className="text-foreground-secondary text-body-sm">
              Order ID:{" "}
              <span className="font-medium text-foreground-primary">
                {newOrder?.order?.invoice}
              </span>
            </p>
            <p className="text-foreground-secondary text-body-sm">
              Date placed:{" "}
              <span className="font-medium text-foreground-primary">
                {newOrder?.created_at && formatDate(new Date(newOrder?.created_at))}
              </span>
            </p>
            <p className="text-foreground-secondary text-body-sm">
              Payment method:{" "}
              <span className="font-medium text-foreground-primary">
                Credit card via Paystack
              </span>
            </p>
          </div>
        </div>
      </PageShell>

      <Dialog isOpen={isModalOpen} onClose={() => setModalOpen(false)} ariaLabel="Rate your order">
        <div className="space-y-4">
          <p className="text-h2 font-medium">
            How was your order from{" "}
            <span className="font-medium">
              {stores?.find((store) => store?.id === newOrder?.business_id)?.name}
            </span>
          </p>

          <div className="w-full flex space-x-3 border-outline border rounded-field p-2">
            <img
              src={
                ratedProduct?.image
                  ? ratedProduct.image[0]
                  : "/PRODUCT IMAGE (2).png"
              }
              className="w-[60px] h-[60px] object-cover rounded-field border border-outline"
              alt={ratedProduct?.title || ""}
            />
            <div className="flex-1 flex-col flex justify-between">
              <p className="text-foreground-primary font-normal text-body-sm">
                {ratedProduct?.title || ""}
              </p>
              {newOrder?.variant_selection && (
                <p className="text-foreground-muted text-body-sm font-medium">
                  {newOrder.variant_selection}
                </p>
              )}
              <div className="flex text-foreground-secondary text-body-sm font-medium space-x-4">
                <p>{formatCurrency(newOrder?.price || 0)}</p>
                <p className="text-foreground-primary">x{newOrder?.quantity}</p>
              </div>
            </div>
          </div>

          {/* Star Rating */}
          <div className="flex gap-2 items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                onClick={() => handleStarClick(star)}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={rating >= star ? "rgb(var(--warning-foreground-rgb))" : "rgb(var(--surface-muted-rgb))"}
                stroke={rating >= star ? "rgb(var(--warning-foreground-rgb))" : "rgb(var(--outline-strong-rgb))"}
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
                <button
                  key={chip.value}
                  onClick={() => handleChipClick(chip.value)}
                  className={`px-3 py-1 rounded-full border text-caption font-medium cursor-pointer transition-colors duration-300 ${
                    rating === chip.value
                      ? "bg-warning-foreground border-warning-foreground text-foreground-primary"
                      : "bg-surface-muted border-outline text-foreground-secondary"
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
          <Button variant="filled" onClick={handleRatingSubmit}>
            Submit review
          </Button>
        </div>
      </Dialog>
    </>
  );
};

export default Order;
