/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, { useEffect, useState } from "react";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import { useRouter, useSearchParams } from "next/navigation";
import useOrderStore from "@/store/orderStore";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image";
import useAuthStore from "@/store/authStore";
import Loader from "@vibaar/ui/common/Loader";
import useShippingStore from "@/store/shippingStore";
import { trackPurchase } from "@/lib/analytics";
import { ORDER_ON_SUCCESS } from "@/lib/flags";

const PaymentSucceful = () => {
  const { order, getOrderById, getGuestOrdersById, getOrderByIdPublic, verifyTransaction, addToCarts, setCheckoutCart } =
    useOrderStore();
  const { guestId } = useShippingStore();
  const { user } = useAuthStore();
  // const { id } = useParams();
  const searchParams = useSearchParams();
  const reference: string = searchParams.get("reference") as string;
  const orderId: string = searchParams.get("order_id") as string;
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const router = useRouter();

  // Helper function to format and truncate shipping address
  const formatShippingAddress = (addressString: string) => {
    if (!addressString) return "Your delivery address";
    
    // Split address by commas and remove duplicates
    const parts = addressString.split(',').map(part => part.trim()).filter(part => part);
    const uniqueParts = [...new Set(parts)];
    
    // Join first 3 unique parts for better readability
    const truncatedAddress = uniqueParts.slice(0, 3).join(', ');
    
    // If address is still too long, truncate to ~60 characters
    if (truncatedAddress.length > 60) {
      return truncatedAddress.substring(0, 57) + '...';
    }
    
    return truncatedAddress;
  };

  // Order-on-success: a failed/abandoned payment created NO order and the cart
  // is intact, so send the buyer back to review to retry with a clear reason,
  // rather than the legacy dead-end "payment not confirmed" screen.
  const handlePaymentFailure = () => {
    if (ORDER_ON_SUCCESS) {
      // Toast on the REVIEW page via a query flag, not here — firing a toast then
      // immediately navigating away can drop it before it renders.
      router.replace("/cart/complete-order/review?payment=failed");
    } else {
      setPaymentStatus("failed");
    }
  };

  useEffect(() => {
    if (!reference) {
      handlePaymentFailure();
      return;
    }
    let active = true;
    (async () => {
      // Authed users verify with their token; guests must carry the guest-id so
      // the backend hits the *_guest tables (order-on-success creates the order here).
      const result = await verifyTransaction(reference, user ? undefined : (guestId as string));
      if (!active) return;
      if (result.success) {
        setPaymentStatus("success");
        addToCarts([]); // clear the cart ONLY after a confirmed-successful payment
        setCheckoutCart([]); // and the checkout selection, so it can't go stale into the next order
        if (ORDER_ON_SUCCESS) {
          // The order is created DURING verify on this flow, so fetch it now
          // (by the invoice Paystack returned as `reference`) for the receipt.
          getOrderByIdPublic(reference);
        }
      } else {
        handlePaymentFailure();
      }
    })();
    return () => {
      active = false;
    };
  }, [reference]);

  useEffect(() => {
    // Use order_id if available, otherwise try to get order by reference
    const orderIdToUse = orderId || reference;
    
    console.log("Payment Success Page Debug:", {
      orderId,
      reference,
      orderIdToUse,
      user: !!user,
      guestId,
      order: order
    });
    
    if (orderIdToUse) {
      // Check if orderIdToUse looks like an invoice (short alphanumeric) vs UUID (long with dashes)
      const isInvoiceFormat = orderIdToUse.length < 20 && !orderIdToUse.includes('-');
      
      if (isInvoiceFormat) {
        // If it's an invoice format (from payment redirect), always use public endpoint
        console.log("Using public endpoint for invoice format:", orderIdToUse);
        getOrderByIdPublic(orderIdToUse);
      } else if (user) {
        console.log("Fetching order for user:", orderIdToUse);
        getOrderById(orderIdToUse);
      } else if (guestId) {
        console.log("Fetching order for guest:", guestId, orderIdToUse);
        getGuestOrdersById(guestId as string, orderIdToUse);
      } else {
        // Fallback to public endpoint
        console.log("No user/guest context, using public order fetch:", orderIdToUse);
        getOrderByIdPublic(orderIdToUse);
      }
    }
  }, [orderId, reference, user, guestId]);

  // Track purchase event when order is loaded
  useEffect(() => {
    if (order?.id && order?.order?.total) {
      const items = order?.order?.items || [];
      trackPurchase(
        order.id,
        order.order.total,
        items.map((item: { product_id?: string; name?: string; title?: string; price?: number; quantity?: number }) => ({
          id: item.product_id || '',
          name: item.name || item.title || '',
          price: item.price || 0,
          quantity: item.quantity || 0,
        }))
      );
    }
  }, [order?.id, order?.order?.total]);

  if (loading || paymentStatus === "verifying") {
    return <Loader />;
  }

  if (paymentStatus === "failed") {
    return (
      <PageShell
        header={<Header onBack={() => router.back()} />}>
        <div className="w-full flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mb-6 mt-10">
            <span className="text-brandDeep text-h1 font-semibold">!</span>
          </div>
          <p className="text-h1 font-medium mb-2">Payment not confirmed</p>
          <p className="text-foreground-secondary text-body font-normal mb-1 max-w-[320px]">
            We couldn&apos;t confirm your payment. If your account was charged it may
            take a moment to reflect — please check your orders before paying again.
          </p>
          <button
            onClick={() => router.push("/orders")}
            className="text-brandDeep border border-brandDeep w-full max-w-[320px] rounded-full px-10 py-2 font-medium mx-auto block mt-8">
            View my orders
          </button>
          <button
            onClick={() => router.push("/cart")}
            className="text-brandInk bg-brand w-full max-w-[320px] rounded-full px-10 py-2 font-medium mx-auto block mt-3">
            Back to cart
          </button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      header={<Header onBack={() => router.back()} />}>
      <div className="w-full">
        <div className="w-full flex justify-center items-center mb-6">
          <svg
            width="104"
            height="83"
            viewBox="0 0 104 83"
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M51.5314 68.1673C66.259 68.1673 78.1981 56.2282 78.1981 41.5007C78.1981 26.7731 66.259 14.834 51.5314 14.834C36.8038 14.834 24.8647 26.7731 24.8647 41.5007C24.8647 56.2282 36.8038 68.1673 51.5314 68.1673ZM66.3548 34.8347C67.0916 34.0118 67.0217 32.7474 66.1988 32.0106C65.3759 31.2738 64.1115 31.3437 63.3747 32.1666L54.3902 42.2017C52.5697 44.2352 51.3437 45.5974 50.2955 46.4784C49.2969 47.3177 48.7104 47.5007 48.1981 47.5007C47.6857 47.5007 47.0992 47.3177 46.1007 46.4784C45.0525 45.5974 43.8265 44.2352 42.0059 42.2017L39.6881 39.6129C38.9514 38.79 37.687 38.7201 36.864 39.4569C36.0411 40.1937 35.9712 41.4581 36.708 42.281L39.1248 44.9805C40.8204 46.8745 42.2347 48.4543 43.527 49.5405C44.8941 50.6895 46.3685 51.5007 48.1981 51.5007C50.0276 51.5007 51.5021 50.6895 52.8691 49.5405C54.1614 48.4543 55.5757 46.8745 57.2713 44.9805L66.3548 34.8347Z"
              fill="#06C270"
            />
            <path
              d="M78.1982 9.5L79.516 13.0612L83.0771 14.3789L79.516 15.6967L78.1982 19.2578L76.8805 15.6967L73.3193 14.3789L76.8805 13.0612L78.1982 9.5Z"
              fill="#06C270"
            />
            <path
              d="M11.7451 42.6055L13.1763 46.4731L17.0439 47.9043L13.1763 49.3355L11.7451 53.2031L10.314 49.3355L6.44629 47.9043L10.314 46.4731L11.7451 42.6055Z"
              fill="#06C270"
            />
            <path
              d="M85.6091 53.2031L87.6107 58.6124L93.02 60.614L87.6107 62.6156L85.6091 68.0249L83.6075 62.6156L78.1982 60.614L83.6075 58.6124L85.6091 53.2031Z"
              fill="#06C270"
            />
          </svg>
        </div>
        <div>
          <p className="text-h1 font-medium mb-2 text-center">
            Payment successful!
          </p>
          <p className="text-foreground-secondary text-center text-body font-normal mb-1">
            Your payment has been successfully confirmed.
          </p>
          <p className="text-foreground-secondary text-center text-body font-normal mb-8">
            Thank you for shopping on Vibaar.
          </p>
        </div>
        <div className="border border-brandDeep bg-brand/10 rounded-field p-3 space-y-3 text-body-sm font-medium mb-2 mt-10">
          <div className="flex justify-between font-medium">
            <div className="text-foreground-secondary flex-1">Order ID:</div> {order?.order?.invoice || "Loading..."}
          </div>
          <div className="flex justify-between">
            <div className="text-foreground-secondary">Total paid :</div>{" "}
            {formatCurrency(
              order?.order?.total && order.order.total > 0 ? 
                order.order.total : 
                (order?.price || 0) + (parseInt(String((order?.shipping_option as { price?: string })?.price || "").replace(/[^\d]/g, "")) || 0)
            )}
          </div>
          <div className="flex justify-between">
            <div className="text-foreground-secondary">Payment via :</div>{" "}
            Paystack
          </div>
          <div className="flex justify-between items-start">
            <div className="text-foreground-secondary flex-shrink-0 mr-2">Shipping to:</div>
            <div className="text-right text-body-sm flex-1 max-w-[200px]">
              <div className="break-words overflow-hidden" style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                lineHeight: '1.4em',
                maxHeight: '4.2em'
              }}>
                {order?.order?.shipping_profile_id && order.order.shipping_profile_id.includes(',') ? 
                  formatShippingAddress(order.order.shipping_profile_id) : 
                  order?.order?.shipping_profile_id ? 
                  "Default Address" : 
                  "Your delivery address"}
              </div>
            </div>
          </div>
          <div className="flex justify-between">
            <div className="text-foreground-secondary">Estimated delivery:</div>{" "}
            7–10 business days
          </div>
        </div>
        {!user && (
          <div className="flex flex-col items-center mt-20">
            <p className="text-h1 font-medium mb-2 text-center">
              Track your Order
            </p>
            <p className="text-foreground-secondary text-center text-body font-normal mb-1">
              Complete account setup to
            </p>
            <p className="text-foreground-secondary text-center text-body font-normal mb-8">
              manage and track your order
            </p>
            <Image
              src="/images/threearrowdown.svg"
              alt="successfull"
              width={12}
              height={22}
            />
          </div>
        )}
        {/* View Order Details Button */}
        <button
          onClick={
            user
              ? () => {
                  setLoading(true);
                  router.replace(`/cart/order-confirmed/${order?.id}`);
                }
              : () => {
                  setLoading(true);
                  // Route to signin landing page (step 0) with guest params
                  const signinParams = new URLSearchParams({
                    step: '0',
                    guest_order_id: order?.id || '',
                    guest_id: guestId as string || ''
                  });
                  router.replace(`/signin?${signinParams.toString()}`);
                }
          }
          className="text-brandInk bg-brand w-full rounded-full px-10 md:px-24 py-2 font-medium mx-auto block mt-6">
          {user ? "View order details" : "Sign in"}
        </button>
      </div>
    </PageShell>
  );
};

export default PaymentSucceful;
