/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useEffect, useState } from "react";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import IconButton from "@vibaar/ui/common/IconButton";
import StepNavigation from "@vibaar/ui/common/StepNavigation";
import { BsThreeDotsVertical } from "@vibaar/ui/icons";
import VendorNav from "@/features/storefront/VendorNav";
import { FaStar, MdFavoriteBorder } from "@vibaar/ui/icons";
import { useParams, useRouter } from "next/navigation";
import CartIcon from "@/assets/icons/CartIcon";
import useOrderStore from "@/store/orderStore";
import { formatCurrency, getMobileCompatibleImageUrl } from "@/lib/utils";
import useProductStore from "@/store/productStore";
import useAuthStore from "@/store/authStore";
import useShippingStore from "@/store/shippingStore";

const OrderConfirmed = () => {
  const { order, getOrderById, getGuestOrdersById, getOrderByIdPublic } =
    useOrderStore();
  const { products } = useProductStore();
  const { user } = useAuthStore();
  const { guestId } = useShippingStore();
  const { id } = useParams();

  useEffect(() => {
    if (!id) return;
    // Guest-aware, mirroring payment-successful: a guest who lands here after
    // paying resolves their order instead of seeing an empty confirmation.
    if (user) getOrderById(id as string);
    else if (guestId) getGuestOrdersById(guestId as string, id as string);
    else getOrderByIdPublic(id as string);
  }, [getOrderById, getGuestOrdersById, getOrderByIdPublic, id, user, guestId]);

  // Debug logging
  console.log("Order Debug:", {
    order,
    orderOrder: order?.order,
    buyerActivity: order?.order?.buyer_activity,
    buyerActivityLength: order?.order?.buyer_activity?.length,
    firstBuyerItem: order?.order?.buyer_activity?.[0],
    orderCart: order?.cart,
    orderOrderCart: order?.order?.cart,
    orderItems: order?.order?.items,
    orderOrderItems: order?.order?.order_items,
    hasItems: order?.cart?.length || order?.order?.cart?.length || order?.order?.items?.length
  });
  const truncateTextByLength = (
    text: string | undefined,
    charLimit: number
  ) => {
    return text && text?.length > charLimit
      ? text?.slice(0, charLimit) + "..."
      : text;
  };

  const router = useRouter();
  const [likedStates, setLikedStates] = useState<boolean[]>(
    Array(products.length).fill(false)
  );

  const handleProductClick = (index: number) => {
    // Example navigation logic
    const selectedProduct = products[index];
    router.push(
      `/products/${selectedProduct?.title?.replace(/\s+/g, "-").toLowerCase()}`
    );
  };

  const handleLikeClick = (index: number) => {
    const newLikedStates = [...likedStates];
    newLikedStates[index] = !newLikedStates[index];
    setLikedStates(newLikedStates);
  };

  // Real per-item delivery estimate chosen at checkout (was a fabricated
  // "today + 10 days"). Show it if present, otherwise show nothing — never fake.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderItemsForEta: any[] =
    order?.cart ||
    order?.order?.cart ||
    order?.order?.items ||
    order?.order?.order_items ||
    [];
  const deliveryEstimate = orderItemsForEta
    .map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (it: any) =>
        it?.shippingEstimate ||
        it?.delivery_days ||
        it?.shipping_option?.delivery_days
    )
    .find((v: string) => v);

  return (
    <PageShell
      header={
        <Header
          onBack={() => router.back()}
          title="Complete order"
          trailing={<IconButton icon={BsThreeDotsVertical} label="Menu" />}
          progress={<StepNavigation step={2} totalSteps={2} />}
        />
      }>
      <div className="w-full pt-4">
        <p className="text-h1 font-medium mb-2">Order confirmed</p>
        <p className="text-foreground-secondary text-body font-normal mb-5">
          Thank you for shopping on Vibaar. <br /> You will receive a
          confirmation email.
        </p>

        <div className="border border-outline rounded-field p-3">
          {/* Order Details */}
          <div className="space-y-3 text-body-sm font-medium mb-4">
            <p>
              <span className="text-foreground-secondary">Order ID:</span> {order?.order?.invoice}
            </p>
            <p>
              <span className="text-foreground-secondary">Total cost:</span>{" "}
              {formatCurrency(
                order?.order?.total && order.order.total > 0 ?
                  order.order.total :
                  (order?.price || order?.total || 0) + (order?.shipping_cost || 0)
              )}
            </p>
            {deliveryEstimate && (
              <p>
                <span className="text-foreground-secondary">Estimated delivery:</span>{" "}
                {deliveryEstimate}
              </p>
            )}
          </div>

          {/* Order Items Preview */}
          {(() => {
            // Try different possible locations for cart items, prioritizing non-empty arrays
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let cartItems: any[] = [];
            
            if (order?.cart && order.cart.length > 0) {
              cartItems = order.cart;
            } else if (order?.order?.cart && order.order.cart.length > 0) {
              cartItems = order.order.cart;
            } else if (order?.order?.items && order.order.items.length > 0) {
              cartItems = order.order.items;
            } else if (order?.order?.order_items && order.order.order_items.length > 0) {
              cartItems = order.order.order_items;
            } else if (order?.order?.buyer_activity && order.order.buyer_activity.length > 0) {
              cartItems = order.order.buyer_activity;
            }
            
            const itemCount = cartItems.length;
            
            console.log("Cart Items Debug:", { 
              cartItems, 
              itemCount, 
              orderExists: !!order,
              buyerActivityExists: !!order?.order?.buyer_activity,
              buyerActivityLength: order?.order?.buyer_activity?.length
            });
            
            if (itemCount > 0) {
              return (
                <div className="mb-4">
                  <p className="text-foreground-secondary text-body-sm font-medium mb-3">
                    Items ({itemCount})
                  </p>
                  <div className="space-y-3">
                    {cartItems.map((item, index) => {
                      console.log("Individual item:", item);
                      const productDetails = products.find(
                        (prod) => prod?.id === (item?.product_id || item?.id)
                      );
                      return (
                        <div key={item?.product_id || item?.id || index} className="flex items-center gap-3 p-2 bg-surface-subtle rounded-field">
                          <div className="w-12 h-12 flex-shrink-0">
                            <img
                              src={
                                productDetails?.image
                                  ? getMobileCompatibleImageUrl(productDetails?.image[0])
                                  : "/PRODUCT IMAGE (2).png"
                              }
                              alt={productDetails?.title}
                              className="w-12 h-12 object-cover rounded-field"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-body-sm font-medium text-foreground-primary truncate">
                              {productDetails?.title || item?.title || item?.name || item?.product?.title || 'Product'}
                            </p>
                            <p className="text-body-sm text-foreground-secondary">
                              Qty: {item?.quantity || 1} × {formatCurrency(item?.price || item?.product?.price || 0)}
                            </p>
                          </div>
                          <div className="text-body-sm font-medium">
                            {formatCurrency((item?.price || item?.product?.price || 0) * (item?.quantity || 1))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
            
            // Fallback when no items found
            return (
              <div className="mb-4">
                <p className="text-foreground-secondary text-body-sm font-medium mb-3">
                  Order Items
                </p>
                <div className="p-4 bg-surface-subtle rounded-field text-center">
                  <p className="text-body-sm text-foreground-secondary">No items to display</p>
                </div>
              </div>
            );
          })()}

          {/* View Order Details Button */}
          <button
            onClick={() => router.push("/orders")}
            className="border w-full border-outline text-brandDeep rounded-3xl px-10 md:px-24 py-2 font-medium mx-auto block mt-3">
            View order details
          </button>
        </div>

        {/* Products Section */}

        <div className="mb-5">
          <p className="font-medium text-body mt-5">You may also like</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {products.slice(0, 6).map((item, index) => (
            <div
              key={index}
              className="cursor-pointer relative bg-surface rounded-field overflow-hidden"
              onClick={() => handleProductClick(index)}>
              <div className="relative w-full aspect-square">
                <img
                  src={item.image ? getMobileCompatibleImageUrl(item.image[0]) : "/PRODUCT IMAGE (2).png"}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                <span
                  className={`absolute top-2 right-2 h-8 w-8 flex justify-center items-center rounded-full cursor-pointer ${
                    likedStates[index] ? "bg-brand" : "bg-surface-muted"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLikeClick(index);
                  }}>
                  <MdFavoriteBorder
                    style={{ fill: likedStates[index] ? "white" : "white" }}
                    className="text-body"
                  />
                </span>
                <span className="absolute bottom-2 right-2 h-8 w-8 flex justify-center items-center rounded-full cursor-pointer bg-surface-muted">
                  <CartIcon />
                </span>
              </div>
              <div className="p-3">
                <p className="text-body-sm font-medium mb-1 line-clamp-2">
                  {truncateTextByLength(item.title, 40)}
                </p>
                {item?.original_price && (
                  <p className="text-body-sm text-foreground-disabled font-medium line-through mb-1">
                    {formatCurrency(
                      item?.original_price ? +item?.original_price : 0
                    )}
                  </p>
                )}
                <div className="flex justify-between items-center">
                  <p className="text-body font-medium">
                    {formatCurrency(item.price ? +item.price : 0)}
                  </p>
                  <div className="flex items-center gap-1">
                    <FaStar fill="#FFD700" size={12} />
                    <p className="text-body-sm text-foreground-muted">{item.rating}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <VendorNav />
      </div>
    </PageShell>
  );
};

export default OrderConfirmed;
