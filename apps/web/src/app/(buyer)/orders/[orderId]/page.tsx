/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useState } from "react";
import { PiCube, CircleCheck, ChevronUp, ChevronDown } from "@/design-system/icons";
import PageShell from "@/design-system/PageShell";
import Header from "@/design-system/common/Header";
import Dialog from "@/design-system/common/Dialog";
import useOrderStore from "@/store/orderStore";
import { useParams } from "next/navigation";
import Loader from "@/design-system/common/Loader";
import { useRouter } from "next/navigation";
import {
  formatCurrency,
  formatDate,
  // formatTimeAgo,
  // getProductDetails,
} from "@/lib/utils";
import useProductStore from "@/store/productStore";
import useBusinessStore from "@/store/businessStore";
import InputField from "@/design-system/common/InputField";
import Button from "@/design-system/common/Button";
import useAuthStore from "@/store/authStore";
// import Image from "next/image";
import useShippingStore from "@/store/shippingStore";
import { Emergency, Shield } from "@/design-system/svg";
import { OrderStatusIcon } from "@/features/orders/orderStatus";
import DispatchContactCard from "@/features/orders/DispatchContactCard";
import { formatTimeAgos, formatTimestamp } from "@/lib/converter";
import { OrderDatas } from "@/lib/order";
import { ProductData } from "@/lib/types";

const ActivityTop = ({ title, date }: { title: string; date: string }) => {
  return (
    <div className="flex gap-3">
      <OrderStatusIcon status={title} />
      <div className="flex flex-col justify-between">
        <p className="text-ink-60 font-normal text-body-sm">Status:</p>
        <p className="text-ink-90 font-medium text-h1">{title}</p>
        <p className="text-ink-60 font-normal text-body-sm">
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
              ? "text-success-strong"
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

const Check = () => <CircleCheck size={16} className="text-ink-40" />;

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
  price,
  variant,
}: {
  name: string;
  quantity: number;
  image: string;
  price: number;
  variant?: string;
}) => {
  return (
    <div className="w-full flex space-x-3 border-ink-10 border rounded-field p-2">
      <img
        src={image} // Dynamic product image
        className="w-[60px] h-[60px] object-cover rounded-field border"
        alt={name}
      />
      <div className="flex-1 flex-col flex justify-between">
        <p className="text-ink-90 font-normal text-body-sm">{name}</p>
        {variant && (
          <div className="flex text-ink-40 text-body-sm font-medium space-x-4">
            <p>{variant}</p>
          </div>
        )}
        <div className="flex text-ink-60 text-body-sm font-medium space-x-4">
          <p> {formatCurrency(price)}</p>
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
        <ItemCard
          name={productName?.title as string}
          quantity={order.quantity}
          image={
            productName?.image ? productName.image[0] : "/PRODUCT IMAGE (2).png"
          }
          price={order.price}
          variant={order.variant_selection}
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
            productName?.original_price
              ? +productName?.original_price - +order.price
              : 0
          }
        />
        <Sales
          item1="Shipping:"
          item2={order.shipping_option?.price ? +order.shipping_option.price.slice(3) : 0}
        />
        <Sales item1="Total:" item2={order.order?.total || ((order.price * order.quantity) + (order.shipping_option?.price ? +order.shipping_option.price.slice(3) : 0))} />
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
        <span className="border-[0.5px] rounded-full font-normal px-3 py-[2px] text-body-sm border-brand bg-brand/10 text-brand w-[max-content]">
          Default
        </span>
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
          className="w-full rounded-full py-2 border bg-white text-brand text-body font-medium mt-2">
          Change Shipping Details
        </button>
      </div>
    </div>
  );
};

const Bottom = () => {
  return (
    <div className="w-full mt-4 pb-3 flex justify-between items-center">
      <div className="flex text-ink-90 font-medium text-body-sm items-center">
        <Shield /> Return policy
      </div>
      <div className="flex items-center text-ink-60 text-body-sm">
        Free return within{" "}
        <div className=" text-ink-90 mx-1 font-medium text-body-sm">
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
              fill={filled ? "var(--warning)" : "var(--ink-5)"}
              stroke="var(--warning)"
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

      <p className="text-body-sm font-medium text-center text-ink-60 mt-2">
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
            showBack
            customText="Order"
            onBackClick={() => router.back()}
          />
        }>
        <div className="w-full flex flex-col items-center text-center mt-20">
          <p className="text-h2 font-medium mb-2">Order not found</p>
          <p className="text-ink-60 text-body-sm mb-6 max-w-[320px]">
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
            showBack
            onBackClick={() => router.push("/orders")}
            customText={`Order #${newOrder?.order?.invoice}`}
            showEmer
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
                  ? "relative border border-ink-10 rounded-card px-4 pb-3 pt-4 gap-3 w-full"
                  : "relative border border-ink-10 rounded-card px-4 pb-3 pt-4 gap-3 h-[204px] w-full overflow-hidden"
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
                <div
                  onClick={() => setStatus(!status)}
                  className="flex justify-center items-center mt-2 text-brand font-medium text-body-sm">
                  Collapse timeline{" "}
                  <ChevronUp size={16} className="text-brand" />
                </div>
              ) : (
                <>
                  <div className="absolute bottom-0 left-0 right-0 h-[60px] bg-gradient-to-t from-white via-white to-transparent" />
                  <div
                    onClick={() => setStatus(!status)}
                    className="flex justify-center items-center text-brand font-medium text-body-sm w-full absolute bottom-3 left-0 right-0 h-[40px]">
                    View full timeline{" "}
                    <ChevronDown size={16} className="text-brand" />
                  </div>
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
            <p className="text-ink-60 text-body-sm">
              Order ID:{" "}
              <span className="font-medium text-ink-90">
                {newOrder?.order?.invoice}
              </span>
            </p>
            <p className="text-ink-60 text-body-sm">
              Date placed:{" "}
              <span className="font-medium text-ink-90">
                {newOrder?.created_at && formatDate(new Date(newOrder?.created_at))}
              </span>
            </p>
            <p className="text-ink-60 text-body-sm">
              Payment method:{" "}
              <span className="font-medium text-ink-90">
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

          <div className="w-full flex space-x-3 border-ink-10 border rounded-field p-2">
            <img
              src={
                ratedProduct?.image
                  ? ratedProduct.image[0]
                  : "/PRODUCT IMAGE (2).png"
              }
              className="w-[60px] h-[60px] object-cover rounded-field border border-ink-10"
              alt={ratedProduct?.title || ""}
            />
            <div className="flex-1 flex-col flex justify-between">
              <p className="text-ink-90 font-normal text-body-sm">
                {ratedProduct?.title || ""}
              </p>
              {newOrder?.variant_selection && (
                <p className="text-ink-40 text-body-sm font-medium">
                  {newOrder.variant_selection}
                </p>
              )}
              <div className="flex text-ink-60 text-body-sm font-medium space-x-4">
                <p>{formatCurrency(newOrder?.price || 0)}</p>
                <p className="text-ink-90">x{newOrder?.quantity}</p>
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
                  onClick={() => handleChipClick(chip.value)}
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
          <Button variant="filled" onClick={handleRatingSubmit}>
            Submit review
          </Button>
        </div>
      </Dialog>
    </>
  );
};

export default Order;
