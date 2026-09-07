/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import React, { useEffect, useRef, useState } from "react";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import StepNavigation from "@vibaar/ui/common/StepNavigation";
import { BsThreeDotsVertical } from "@vibaar/ui/icons";
import IconButton from "@vibaar/ui/common/IconButton";
import { Minus, Plus, Delete, Gift } from "@vibaar/ui/icons";
import ShippingOptionCard from "@/design-system/common/ShippingOptionCard";
import { useRouter, useSearchParams } from "next/navigation";
// import RadioGroupColumn from "@vibaar/ui/common/RadioGroupColumn"; // Removed - not used after hiding payment options
import useOrderStore from "@/store/orderStore";
import { formatCurrency, parseAmount } from "@/lib/utils";
import useAuthStore from "@/store/authStore";
import { toast } from "sonner";
import Loader from "@vibaar/ui/common/Loader";
import Button from "@vibaar/ui/common/Button";
import Switch from "@vibaar/ui/common/Switch";
import BottomModal from "@vibaar/ui/common/BottomModal";
import useShippingStore, { ShippingOptionInfo } from "@/store/shippingStore";
import { CartsItems } from "@/lib/newinterface";
import { Client } from "@/lib/client";
import { RewardsInfo } from "@/lib/types";
import { trackCheckoutStep, trackAddShippingInfo, trackAddPaymentInfo, trackCheckoutError } from "@/lib/analytics";
import { ORDER_ON_SUCCESS } from "@/lib/flags";
import Badge from "@vibaar/ui/common/Badge";

const CartItem = ({
  cart,
  delivery,
  action,
  increment,
  decrement,
}: {
  cart: {
    color: string;
    price: number;
    title: string;
    image: string;
    quantity: number;
    id: string;
  };
  delivery: {
    title: string;
    price: string;
    estimate: string;
  };
  action: () => void;
  increment: (val: string) => void;
  decrement: (val: string) => void;
}) => {
  return (
    <div className="bg-surface-subtle rounded-field p-1 mt-3">
      <div className="flex gap-2 mb-4 bg-surface p-3 rounded-field">
        <div className="h-[60px] w-[60px]">
          <img
            src={cart.image || "/PRODUCT IMAGE (2).png"}
            alt=""
            className="rounded-field h-[60px] w-[60px] object-cover"
          />
        </div>
        <div className="flex flex-col w-full gap-3">
          <div>
            <p className="text-body-sm font-normal">{cart.title}</p>
            <p className="text-body-sm font-normal text-foreground-muted">
              Color: {cart.color}
            </p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-body-sm font-normal">{formatCurrency(cart.price)}</p>
            <div className="flex items-center space-x-3">
              {cart.quantity === 0 ? (
                <IconButton
                  icon={Delete}
                  label="Remove item"
                  onClick={() => decrement(cart.id)}
                  className="bg-surface-subtle"
                  iconClassName="text-error-foreground"
                  iconSize={18}
                />
              ) : (
                <IconButton
                  icon={Minus}
                  label="Decrease quantity"
                  onClick={() => decrement(cart.id)}
                  className="bg-surface-subtle"
                  iconSize={18}
                />
              )}
              <span className="text-body font-normal">{cart.quantity}</span>
              <IconButton
                icon={Plus}
                label="Increase quantity"
                onClick={() => increment(cart.id)}
                className="bg-surface-subtle"
                iconSize={18}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full p-2 flex flex-col gap-3">
        <div className="flex items-center text-body-sm text-foreground-secondary ">
          {delivery.title}
          <span className="ml-auto font-medium text-foreground-primary">
            {delivery.price}
            {"   "}
            <button onClick={action} className="text-brandDeep font-medium">
              {delivery.title ? "Change" : "Select"}
            </button>
          </span>
        </div>
        <div className="flex items-center text-body-sm text-foreground-secondary ">
          Arrives by:{" "}
          <span className="ml-auto font-medium text-foreground-primary">
            {delivery.estimate}
          </span>
        </div>
      </div>
    </div>
  );
};

const ReviewOrder = () => {
  const {
    cart: storeCart,
    checkoutCart,
    addToCarts,
    createOrders,
    createGuestOrders,
    initiateTransaction,
    initiateGuestTransaction,
    initiateCheckout,
    initiateGuestCheckout,
    isLoading,
  } = useOrderStore();
  // Use the checkout selection when present (set from the cart page); fall back
  // to the full cart for direct navigation.
  const cart = checkoutCart && checkoutCart.length > 0 ? checkoutCart : storeCart;
  const {
    singleShippingDetails,
    shippingDetails,
    fetchShippings,
    fetchGuestShippings,
    guestId,
    shippingOptions,
    fetchShippingOptions,
  } = useShippingStore();
  //(shippingDetails);
  const { user } = useAuthStore();
  const serviceFee = 0.0;

  const searchParams = useSearchParams();

  // Surface a failed/cancelled payment when the payment page routes back here.
  useEffect(() => {
    if (searchParams.get("payment") === "failed") {
      toast.error("Your payment wasn't completed. You can try again.");
      // Strip the flag so a refresh doesn't re-toast.
      window.history.replaceState(null, "", "/cart/complete-order/review");
    }
  }, [searchParams]);

  // Rewards credit state
  const isSubmittingRef = useRef(false);
  const [useReferralCredit, setUseReferralCredit] = useState(false);
  const [rewardsInfo, setRewardsInfo] = useState<RewardsInfo | null>(null);

  // Import removeCartItem from the store
  const { removeCartItem, setCheckoutCart } = useOrderStore();
  const [loading, setLoading] = useState<boolean>(false);
  const [selected, setselected] = useState<Partial<CartsItems>>({});

  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const openDeliveryModal = () => setIsDeliveryModalOpen(true);
  const closeDeliveryModal = () => setIsDeliveryModalOpen(false);

  // Track checkout review step
  useEffect(() => {
    if (cart.length > 0 && singleShippingDetails) {
      // Track that user reached review step with shipping info
      trackCheckoutStep(3, 'review_order', subTotal);
      trackAddShippingInfo(
        singleShippingDetails.carrier || 'standard',
        subTotal
      );
    }
  }, []);

  // Fetch fresh rewards info for accurate credit balance
  useEffect(() => {
    const fetchRewardsInfo = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response: any = await Client({
          path: "/rewards/info",
          method: "GET",
        });
        if (response?.data?.data) {
          setRewardsInfo(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch rewards info:", error);
      }
    };
    if (user?.id) {
      fetchRewardsInfo();
    }
  }, [user?.id]);

  const subTotal = cart.reduce((a, b) => a + b.price * b.quantity, 0);

  // Sum per-item shipping into the order total. NOT display-only: this feeds
  // `totals` below, sent as the order `total` (W1.1 charges exactly what's shown).
  // The old /[₦,\s]/ strip left the ASCII "N" prefix → parseFloat("N1500")=NaN→0,
  // silently dropping shipping from the charge (A1). parseAmount strips any mark
  // (N / ₦ / commas), so it's correct regardless of the backend's currency format.
  const shippingCost = cart.reduce((a, b) => a + parseAmount(b.shippingPrice), 0);

  const quantity = cart.reduce((a, b) => a + b.quantity, 0);

  // Calculate available credit (50% max usage rule) - use fresh rewards info if available
  const totalCredit = rewardsInfo
    ? rewardsInfo.total_credit
    : (user?.shopping_credit || 0) + (user?.withdrawable_credit || 0);
  const subtotalWithShipping = subTotal + shippingCost + serviceFee;
  // RW1: whole-Naira, ≤50% of the order — mirrors the server clamp so the displayed
  // credit == the amount actually reserved (the backend floors to whole Naira too).
  const maxUsableCredit = Math.floor(Math.min(totalCredit, subtotalWithShipping * 0.5));
  const creditApplied = useReferralCredit ? maxUsableCredit : 0;

  // For display purposes, show total with shipping and credit applied
  const totals = subtotalWithShipping - creditApplied;

  // Edits at review must update whichever cart review actually reads + submits:
  // the checkout selection when one is active (update ONLY it — never overwrite
  // the main cart with the subset, which would delete un-selected items, W1.8),
  // otherwise the main cart. Without this, on-review edits wrote storeCart while
  // the order read checkoutCart, so they never reached the order.
  const writeCart = (updated: typeof cart) => {
    if (checkoutCart && checkoutCart.length > 0) setCheckoutCart(updated);
    else addToCarts(updated);
  };

  const handleSelect = (option: ShippingOptionInfo) => {
    const res = cart.map((it) => {
      if (it.id === selected.id) {
        return {
          ...it,
          shippingPrice: option.price,
          shippingEstimate: option.delivery_days,
          shippingName: option.delivery_type,
          shippingId: option.id,
        };
      } else {
        return it;
      }
    });
    writeCart(res);
    closeDeliveryModal();
  };
  const router = useRouter();

  useEffect(() => {
    if (user) {
      fetchShippings();
    } else if (guestId && !user) {
      fetchGuestShippings(guestId);
    }
    // W2.4: no cleanup-refetch
  }, [fetchGuestShippings, fetchShippings, guestId, user]);

  async function getShippings(data: { productId: string; quantity: number }) {
    setLoading(true);
    await fetchShippingOptions({
      product_id: data.productId,
      quantity: data.quantity,
      street: singleShippingDetails?.street || "",
      town: singleShippingDetails?.town || "",
      state: singleShippingDetails?.state || "",
      country: singleShippingDetails?.country || "",
      shipping_user: {
        firstname: user?.firstname || "Guest",
        lastname: user?.lastname || "User",
        phone: user?.phone || "08000000000", // Valid Nigerian phone format
        email: user?.email || "guest@vibaar.com",
      },
    })
      .then((res: any) => openDeliveryModal())
      .finally(() => {
        setLoading(false);
      });
  }

  if (isLoading || loading) {
    return <Loader />;
  }

  // if (user && shippingDetails.length === 0) {
  //   // setLoading(true);
  //   return (
  //     <div className="flex-1 p-3 h-screen w-screen flex justify-center items-center">
  //       <div className="border bg-surface rounded-2xl p-3 flex flex-col gap-3">
  //         <p className="text-body-lg text-foreground-primary font-semibold">
  //           Create a shipping addres
  //         </p>
  //         <p className="text-body text-foreground-primary font-normal">
  //           To continue please ensure you have a shipping address created
  //         </p>
  //         <div className="flex w-full gap-2">
  //           <button
  //             onClick={() => router.push("/cart/shipping-profile/new")}
  //             type="button"
  //             className="w-1/2 py-3 rounded-2xl bg-brand  text-brandInk text-body">
  //             create
  //           </button>
  //           <button
  //             onClick={() => router.push("/cart/shipping-profile/new")}
  //             type="button"
  //             className="w-1/2 py-3 rounded-2xl bg-surface border border-brandDeep text-brandDeep text-body">
  //             cancel
  //           </button>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  const increment = (id: string) => {
    return writeCart(
      cart.map((item) => {
        //("clicked incr");
        if (item.id === id) {
          //("clicked incr 1");
          return { ...item, quantity: item.quantity + 1 };
        } else {
          //("clicked incr -1");
          return item;
        }
      })
    );
  };
  const decrement = (id: string) => {
    const item = cart.find(item => item.id === id);
    if (item && item.quantity === 0) {
      // If quantity is 0, remove the item completely (trash icon clicked) —
      // from the active source, so the removal reaches the order.
      if (checkoutCart && checkoutCart.length > 0) {
        setCheckoutCart(cart.filter((it) => it.id !== id));
      } else {
        removeCartItem(id);
      }
    } else {
      // Otherwise, decrease quantity (can go to 0)
      return writeCart(
        cart.map((item) => {
          if (item.id === id) {
            return { ...item, quantity: Math.max(0, item.quantity - 1) };
          } else {
            return item;
          }
        })
      );
    }
  };

  return (
    <PageShell
      header={
        <Header
          onBack={() => router.back()}
          title="Complete order"
          trailing={<IconButton icon={BsThreeDotsVertical} label="Menu" />}
          progress={<StepNavigation step={1} totalSteps={2} />}
        />
      }
      footerAction={
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <p className="text-foreground-muted text-body-sm">Total ({quantity}):</p>
            <p className="font-medium">{formatCurrency(totals)}</p>
          </div>
          <Button
            loading={isLoading}
            className="flex-1"
            onClick={async () => {
        // Guard against double-submission: rapid re-clicks (or backing out of
        // Paystack and clicking again before navigation) previously minted a
        // brand-new order + payment authorization each time (W1.11).
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        try {
          // Check if cart is empty
          if (cart.length === 0) {
            toast.error("Your cart is empty. Add items to proceed");
            trackCheckoutError('review', 'validation', 'Cart is empty');
            return;
          }

          // Check for items with zero quantity
          const zeroQuantityItems = cart.filter(item => item.quantity === 0);
          if (zeroQuantityItems.length > 0) {
            toast.error("Sorry, you cannot checkout items with 0 quantity");
            trackCheckoutError('review', 'validation', 'Items with zero quantity');
            return;
          }

          // Check if there are any valid items (quantity > 0)
          const validItems = cart.filter(item => item.quantity > 0);
          if (validItems.length === 0) {
            toast.error("No valid items in cart to checkout");
            trackCheckoutError('review', 'validation', 'No valid items in cart');
            return;
          }

          // Check if total amount is valid (greater than 0)
          if (subTotal <= 0) {
            toast.error("Order total must be greater than ₦0");
            trackCheckoutError('review', 'validation', 'Order total is zero');
            return;
          }

          // Check if total amount is reasonable (less than ₦1,000,000)
          if (subTotal > 1000000) {
            toast.error("Order total too large. Please contact support for high-value transactions");
            trackCheckoutError('review', 'validation', 'Order total too large');
            return;
          }

          // Every item must have a delivery option — an empty shipping_option_id
          // fails backend validation, and after an address switch the stale
          // quotes are cleared (P2 guard), so require a fresh per-item selection.
          const missingShipping = cart.filter((item) => !item.shippingId);
          if (missingShipping.length > 0) {
            toast.error("Select a delivery option for each item before paying.");
            trackCheckoutError('review', 'validation', 'Missing shipping option');
            return;
          }

          setLoading(true);

          // Order payload is identical across both flows; only WHEN the order is
          // created differs (order-on-success defers it to payment confirmation).
          // RW1: send the GROSS total (product + shipping) + the rewards credit as
          // INTENT — the backend clamps + atomically reserves the real amount and
          // charges gross - reserved. Never send a pre-reduced total.
          const orderPayload = {
            sub_total: subTotal,
            total: subtotalWithShipping,
            credit_applied: creditApplied,
            cart: cart.map((item) => ({
              product_id: item.product_id,
              price: item.price,
              quantity: item.quantity,
              shipping_option_id: item.shippingId,
            })),
            shipping_profile_id: singleShippingDetails?.id ?? "",
          };
          const email =
            singleShippingDetails?.shipping_user?.email ??
            user?.email ??
            "user@gmail.com";

          if (ORDER_ON_SUCCESS) {
            // Single call: validate + initiate payment. The order is created on
            // charge.success — a failed/abandoned payment leaves no order and the
            // cart stays intact (see payment-successful failure handling).
            trackAddPaymentInfo("paystack", totals);
            trackCheckoutStep(4, "payment_initiated", totals);
            if (user) {
              await initiateCheckout(orderPayload, email);
            } else {
              await initiateGuestCheckout(orderPayload, guestId as string, email);
            }
          } else if (user) {
            //("using user create");
            await createOrders(
              orderPayload,
              (orderResponse: any) => {
                //("order response => ", orderResponse);
                // Track payment initiation
                trackAddPaymentInfo('paystack', orderResponse?.total || subTotal);
                trackCheckoutStep(4, 'payment_initiated', orderResponse?.total || subTotal);

                initiateTransaction(
                  orderResponse?.invoice,
                  orderResponse?.total,
                  singleShippingDetails?.shipping_user?.email ??
                  "user@gmail.com"
                );
                toast.success(
                  "Order created and transaction initiated successfully!"
                );
                // Note: Cart is now cleared only after successful payment
              }
            );
          } else {
            //("using guest create");
            await createGuestOrders(
              orderPayload,
              guestId as string,
              (orderResponse: any) => {
                //("order response => ", orderResponse);
                // Track payment initiation for guest
                trackAddPaymentInfo('paystack', orderResponse?.total || subTotal);
                trackCheckoutStep(4, 'payment_initiated', orderResponse?.total || subTotal);

                initiateGuestTransaction(
                  orderResponse?.invoice,
                  orderResponse?.total,
                  guestId as string,
                  singleShippingDetails?.shipping_user?.email ??
                  "user@gmail.com"
                );
                toast.success(
                  "Order created and transaction initiated successfully!"
                );
              }
            );
          }
        } catch (error) {
          console.error("Error processing order:", error);
          toast.error("An error occurred. Please try again.");
          trackCheckoutError('payment', 'api_error', error instanceof Error ? error.message : 'Unknown error');
        } finally {
          setLoading(false);
          isSubmittingRef.current = false;
        }
            }}>
            Pay Now
          </Button>
        </div>
      }>
      <div className="pt-4">
        <div className="">
          <div>
            <h1 className="mb-3 font-medium text-h1">Review Order</h1>
          </div>
          <div>
            {cart.map((item) => (
              <CartItem
                key={item.product_id}
                action={() => {
                  setselected(item);
                  getShippings({
                    productId: item.product_id,
                    quantity: item.quantity,
                  });
                }}
                cart={{
                  color: item.color ?? "Default Color",
                  price: item.price,
                  title: item.title,
                  image: item.image,
                  quantity: item.quantity,
                  id: item.id,
                }}
                delivery={{
                  title: item.shippingName,
                  price: item.shippingPrice,
                  estimate: item.shippingEstimate,
                }}
                increment={increment}
                decrement={decrement}
              />
            ))}


            <div className="space-y-3 mt-2 text-body font-normal border rounded-field p-3">
              <div className=" flex justify-between items-center">
                <div className="">Subtotal</div>
                <div>{formatCurrency(subTotal)}</div>
              </div>

              <div className=" flex justify-between items-center">
                <div className="">Shipping</div>
                <div className="text-body-sm">
                  {formatCurrency(shippingCost)}
                </div>
              </div>

              <div className=" flex justify-between items-center">
                <div className="">Service fee</div>
                <div className="text-body-sm">{formatCurrency(serviceFee)}</div>
              </div>

              {creditApplied > 0 && (
                <div className="flex justify-between items-center text-success-foreground">
                  <div>Rewards credit</div>
                  <div className="text-body-sm">
                    -{formatCurrency(creditApplied)}
                  </div>
                </div>
              )}

              <div className=" flex justify-between items-center">
                <div className="text-body-lg font-medium">
                  {creditApplied > 0 ? "You pay" : "Total"}
                </div>
                <div className="text-body-lg font-medium">
                  {formatCurrency(totals)}
                </div>
              </div>
            </div>

            {/* Rewards Credit Toggle (RW1): the backend now atomically RESERVES the
                credit at checkout and charges gross - reserved, so this applies a real
                discount. Order-on-success only (the legacy order-first path has no
                reserve/charge machinery); shown only when the buyer has credit. */}
            {ORDER_ON_SUCCESS && user && totalCredit > 0 && (
              <div className="border border-error-border rounded-card p-4 mt-4 bg-error-surface">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand rounded-full flex items-center justify-center">
                      <Gift size={16} className="text-brandInk" />
                    </div>
                    <div>
                      <p className="font-medium text-body text-foreground-primary">
                        Use Rewards Credit
                      </p>
                      <p className="text-body-sm text-foreground-muted">
                        {formatCurrency(totalCredit)} available
                      </p>
                    </div>
                  </div>
                  <Switch
                    aria-label="Use rewards credit"
                    checked={useReferralCredit}
                    onChange={(event) => setUseReferralCredit(event.target.checked)}
                    disabled={totalCredit === 0}
                    variant="brand"
                  />
                </div>
                {useReferralCredit && maxUsableCredit > 0 && (
                  <p className="text-body-sm text-success-foreground mt-2">
                    -{formatCurrency(creditApplied)} applied (max 50% of order)
                  </p>
                )}
              </div>
            )}

            {/* F5: "Add Coupon" affordance removed — there is no coupon feature
                yet and the button had no behaviour attached (misleading). Restore
                a real control when server-side coupons/discounts land (see R1/R2). */}

            <div className="mt-4">
              <p className="mb-3 text-body-sm font-normal">Shipping method</p>
              <div className="p-2 rounded-field border flex flex-col gap-2 text-body-sm font-normal text-foreground-primary">
                <Badge tone="brand" size="md">Default</Badge>
                <p>
                  {singleShippingDetails?.shipping_user?.firstname +
                    " " +
                    singleShippingDetails?.shipping_user?.lastname}
                </p>
                <p>{singleShippingDetails?.shipping_user?.phone}</p>
                {/* <p>{singleShippingDetails.}</p> */}
                <p>{singleShippingDetails?.street}</p>

                <Button
                  variant="bordered"
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    router.push("/cart/shipping-profile");
                  }}
                  className="text-body-sm px-5 py-1 w-full mt-3">
                  Change Shipping Details
                </Button>
              </div>
            </div>

            {/* Payment option section hidden as requested */}
            {/* <div className="mt-4">
              <p className="mb-3 text-body-sm font-normal">Payment option</p>

              <RadioGroupColumn
                options={[
                  { label: "Pay now", value: "standard" },
                  { label: "Pay on delivery", value: "express" },
                ]}
                name="paymentMethod"
                selectedValue={"standard"}
                onChange={() => { }}
              />
            </div> */}
            <BottomModal
              isOpen={isDeliveryModalOpen}
              onClose={closeDeliveryModal}>
              <div>
                <h2 className="text-body-lg font-medium text-center mb-4 ">
                  Select a delivery option
                </h2>
                <div className="space-y-2">
                  {shippingOptions?.map((option: ShippingOptionInfo) => (
                    <ShippingOptionCard
                      key={option.id}
                      option={option}
                      selected={selected.shippingId === option.id}
                      onSelect={() => handleSelect(option)}
                    />
                  ))}
                </div>
              </div>
            </BottomModal>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default ReviewOrder;
