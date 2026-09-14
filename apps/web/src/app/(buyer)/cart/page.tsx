/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useEffect, useState } from "react";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import { useRouter } from "next/navigation";
import useOrderStore from "@/store/orderStore";
import { formatCurrency } from "@/lib/utils";
import useBusinessStore from "@/store/businessStore";
import useProductStore from "@/store/productStore";
import EmptyState from "@vibaar/ui/common/EmptyState";
import Button from "@vibaar/ui/common/Button";
import IconButton from "@vibaar/ui/common/IconButton";
import { Minus, Plus, Delete, CircleCheck } from "@vibaar/ui/icons";
import NavigationTabs from "@vibaar/ui/common/NavigationTabs";
import Loader from "@vibaar/ui/common/Loader";
import useShippingStore from "@/store/shippingStore";
import { CartsItems } from "@/lib/newinterface";
import { trackBeginCheckout, trackViewCart, trackRemoveFromCart, startTiming } from "@/lib/analytics";

// const cars: CartsItems[] = [
//   {
//     id: "1",
//     product_id: "prod_001",
//     price: 29.99,
//     quantity: 2,
//     title: "Wireless Mouse",
//     image: "https://example.com/images/mouse.jpg",
//     color: "Black",
//     shippingPrice: "$4.99",
//     shippingEstimate: "3-5 business days",
//     shippingName: "Standard Shipping",
//     shippingId: "ship_001",
//   },
//   {
//     id: "2",
//     product_id: "prod_002",
//     price: 99.99,
//     quantity: 1,
//     title: "Mechanical Keyboard",
//     image: "https://example.com/images/keyboard.jpg",
//     color: "White",
//     shippingPrice: "$6.99",
//     shippingEstimate: "2-4 business days",
//     shippingName: "Express Shipping",
//     shippingId: "ship_002",
//   },
//   {
//     id: "3",
//     product_id: "prod_003",
//     price: 59.99,
//     quantity: 3,
//     title: "Bluetooth Headphones",
//     image: "https://example.com/images/headphones.jpg",
//     color: "Blue",
//     shippingPrice: "$5.99",
//     shippingEstimate: "3-7 business days",
//     shippingName: "Standard Shipping",
//     shippingId: "ship_001",
//   },
//   {
//     id: "4",
//     product_id: "prod_004",
//     price: 199.99,
//     quantity: 1,
//     title: "Smart Watch",
//     image: "https://example.com/images/watch.jpg",
//     shippingPrice: "$7.99",
//     shippingEstimate: "1-3 business days",
//     shippingName: "Express Shipping",
//     shippingId: "ship_002",
//   },
//   {
//     id: "5",
//     product_id: "prod_005",
//     price: 25.0,
//     quantity: 4,
//     title: "USB-C Cable",
//     image: "https://example.com/images/cable.jpg",
//     color: "Gray",
//     shippingPrice: "$2.99",
//     shippingEstimate: "5-7 business days",
//     shippingName: "Economy Shipping",
//     shippingId: "ship_003",
//   },
//   {
//     id: "6",
//     product_id: "prod_006",
//     price: 49.99,
//     quantity: 2,
//     title: "Portable Charger",
//     image: "https://example.com/images/charger.jpg",
//     color: "Red",
//     shippingPrice: "$3.99",
//     shippingEstimate: "2-5 business days",
//     shippingName: "Standard Shipping",
//     shippingId: "ship_001",
//   },
//   {
//     id: "7",
//     product_id: "prod_007",
//     price: 89.99,
//     quantity: 1,
//     title: "External SSD",
//     image: "https://example.com/images/ssd.jpg",
//     shippingPrice: "$6.49",
//     shippingEstimate: "3-5 business days",
//     shippingName: "Standard Shipping",
//     shippingId: "ship_001",
//   },
//   {
//     id: "8",
//     product_id: "prod_008",
//     price: 15.0,
//     quantity: 5,
//     title: "Notebook",
//     image: "https://example.com/images/notebook.jpg",
//     color: "Green",
//     shippingPrice: "$1.99",
//     shippingEstimate: "5-10 business days",
//     shippingName: "Economy Shipping",
//     shippingId: "ship_003",
//   },
//   {
//     id: "9",
//     product_id: "prod_009",
//     price: 120.0,
//     quantity: 1,
//     title: "Gaming Chair",
//     image: "https://example.com/images/chair.jpg",
//     color: "Black/Red",
//     shippingPrice: "$15.00",
//     shippingEstimate: "7-10 business days",
//     shippingName: "Freight Shipping",
//     shippingId: "ship_004",
//   },
//   {
//     id: "10",
//     product_id: "prod_010",
//     price: 39.99,
//     quantity: 2,
//     title: "Webcam",
//     image: "https://example.com/images/webcam.jpg",
//     shippingPrice: "$4.49",
//     shippingEstimate: "3-5 business days",
//     shippingName: "Standard Shipping",
//     shippingId: "ship_001",
//   },
// ];

const Page = () => {
  const router = useRouter();
  const tabs = [
    { label: "Cart", path: "/cart" },
    { label: "Order History", path: "/orders" },
  ];
  const { cart: carts, addToCarts, setCheckoutCart } = useOrderStore();
  const { fetchStores } = useBusinessStore((state) => state);
  const { shippingDetails } = useShippingStore();
  const { products, fetchProducts } = useProductStore();
  const { stores } = useBusinessStore();
  const [loading, setLoading] = useState(false);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  const [unchecked, setUnchecked] = useState<string[]>([]);

  const newArr: {
    id: string;
    title: { name: string; img: string };
    data: CartsItems[];
  }[] = carts.reduce((acc, it) => {
    // Use business_id directly from cart item, or fallback to finding via products
    const businameid = it.business_id ||
      products.find((its) => its.product_id === it.product_id)?.business_id ||
      "";

    const business = stores.find((itc) => itc.id === businameid);
    const businame = business?.name || "Vendor name";
    const busiimg = (business?.logo as string | undefined) || "";

    console.log("🛒 Cart grouping debug:", {
      cartItemId: it.id,
      businessId: businameid,
      businessName: businame,
      storesCount: stores.length
    });

    const finder = acc.findIndex((group) => group.id === businameid);

    if (finder >= 0) {
      acc[finder].data.push(it);
    } else {
      acc.push({
        id: businameid,
        title: { name: businame, img: busiimg },
        data: [it],
      });
    }
    return acc;
  }, [] as { id: string; title: { name: string; img: string }; data: CartsItems[] }[]);

  useEffect(() => {
    fetchStores();
    fetchProducts();
  }, [fetchStores, fetchProducts]);

  // Track view_cart when cart page loads with items
  useEffect(() => {
    if (carts.length > 0) {
      const total = carts.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      trackViewCart(
        carts.map(item => ({
          id: item.product_id,
          name: item.title,
          price: item.price,
          quantity: item.quantity,
        })),
        total
      );
      // Start checkout timing when viewing cart
      startTiming('checkout');
    }
  }, []);

  const increment = (id: string) => {
    return addToCarts(
      carts.map((item) => {
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
  const { removeCartItem } = useOrderStore();

  const decrement = (id: string) => {
    const item = carts.find(item => item.id === id);
    if (item && item.quantity === 0) {
      // If quantity is 0, remove the item completely (trash icon clicked)
      // Track remove from cart event
      trackRemoveFromCart({
        id: item.product_id,
        name: item.title,
        price: item.price,
        quantity: 1, // Removing 1 item
      });
      removeCartItem(id);
    } else {
      // Otherwise, decrease quantity (can go to 0)
      return addToCarts(
        carts.map((item) => {
          //("clicked dcr");
          if (item.id === id) {
            //("clicked dcr 1");
            return { ...item, quantity: Math.max(0, item.quantity - 1) };
          } else {
            //("clicked dcr -1");
            return item;
          }
        })
      );
    }
  };

  const CartCard = ({ cart, id }: { cart: CartsItems; id: string }) => (
    <div className="bg-surface-subtle rounded-field mt-3 relative">
      <div className="flex gap-2 mb-4 bg-surface rounded-field">
        <div className="h-20 w-20">
          <img
            src={cart.image || "/images/product-placeholder.svg"}
            alt=""
            className="rounded-field h-[80px] w-[80px] object-cover"
          />
        </div>
        <div className="flex flex-col w-full gap-3">
          <div>
            <p className="text-body-sm font-normal">{cart.title}</p>
            <p className="text-body-sm font-medium text-foreground-muted">
              Color: {cart.color}
            </p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-body-sm font-normal">{formatCurrency(cart.price)}</p>
            <div className="flex items-center space-x-1">
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
          <div
            onClick={() => {
              if (unchecked.includes(cart.id)) {
                return setUnchecked(unchecked.filter((it) => it !== cart.id));
              } else {
                return setUnchecked((prev) => [...prev, cart.id, id]);
              }
            }}
            className="absolute right-0 top-0 cursor-pointer">
            {unchecked.includes(cart.id) ? (
              <div className="w-5 h-5 rounded-full border border-brandDeep" />
            ) : (
              <CircleCheck size={20} className="text-brandDeep" />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const Cart = () => (
    <div className="py-4">
      {carts.length <= 0 ? (
        <EmptyState
          title="Your cart is empty."
          subtitle="Once you add a product to your cart, they will appear here."
          image="/images/cart/empty_cart_state.svg">
          <Button
            variant="bordered"
            type="button"
            onClick={() => router.push("/shop")}
            size="sm"
            fullWidth={false}>
            Explore vendors
          </Button>
        </EmptyState>
      ) : (
        newArr.map((cart, index) => {
          return (
            <div key={cart.title.name} className={index > 0 ? "mt-6" : ""}>
              <div className="flex justify-between items-center w-full">
                <div className="flex gap-1 items-center">
                  <img
                    src={cart.title.img || "/images/product-placeholder.svg"}
                    alt=""
                    className="rounded-full h-[20px] w-[20px] object-cover"
                  />
                  <p className="text-body text-foreground-primary font-medium">
                    {cart.title.name}
                  </p>
                </div>
                <div
                  className="cursor-pointer"
                  onClick={() => {
                    if (unchecked.includes(cart.id)) {
                      const l = unchecked.map((it) => {
                        const nex = [cart.id, ...cart.data.map((t) => t.id)];
                        if (!nex.includes(it)) {
                          return it;
                        } else {
                          return "";
                        }
                      });
                      return setUnchecked(l.filter((i) => i !== ""));
                    } else {
                      const nex = [cart.id, ...cart.data.map((t) => t.id)];
                      return setUnchecked((prev) => [...prev, ...nex]);
                    }
                  }}>
                  {unchecked.includes(cart.id) ? (
                    <div className="w-5 h-5 rounded-full border border-brandDeep" />
                  ) : (
                    <CircleCheck size={20} className="text-brandDeep" />
                  )}
                </div>
              </div>
              {cart.data.map((it) => (
                <CartCard key={it.id} cart={it} id={cart.id} />
              ))}
            </div>
          );
        })
      )}
    </div>
  );

  const totals = carts.filter((its) => {
    if (!unchecked.includes(its.id)) {
      return its;
    }
  });

  if (loading) {
    return <Loader />;
  }

  const handleCheckout = async () => {
    setIsProcessingCheckout(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300)); // Brief delay for UX

      // Track begin_checkout event
      const total = totals.reduce((a, b) => a + +b.price * +b.quantity, 0);
      trackBeginCheckout(
        totals.map(item => ({
          id: item.product_id,
          name: item.title,
          price: +item.price,
          quantity: item.quantity,
        })),
        total
      );

      // Carry only the selected items to checkout WITHOUT overwriting the cart,
      // so unchecked items are preserved (W1.8).
      setCheckoutCart(totals);
      setLoading(true);

      const destination = shippingDetails.length > 0
        ? "/cart/complete-order/review"
        : "/cart/shipping-profile/new";

      await router.push(destination);
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const hasSummary = carts?.length > 0 && totals?.length > 0;

  return (
    <PageShell
      header={
        <Header
          onBack={() => router.back()}
          title="Cart and Orders"
        />
      }
      // The summary is no longer a `footerAction`, so the shell no longer
      // reserves room for one. Below lg the row is still the fixed bar and
      // still needs the clearance; at lg it is in the flow and does not.
      contentClassName={hasSummary ? "pb-24 lg:pb-0" : undefined}>
      {/*
        THE SUMMARY MOVES UP AT lg, AND STAYS ONE NODE.

        At lg it belongs directly under the tabs and above the list — a bounded
        row at the right edge, not a slab across the column and not a bar welded
        to the bottom of the page. Below lg it is the fixed footer it has always
        been, unchanged.

        It is LAST IN THE DOM and placed into row 2 by the grid, rather than
        written between the tabs and the list. Written there it would become a
        tab stop before the cart itself, so a keyboard or screen-reader user
        would meet "Proceed to checkout" before reading what they are buying.
        Grid placement moves the pixels and leaves the reading order alone —
        the same reason PageHeaderBand keeps its action after `<main>`.

        Rows are implicit: two children carry an explicit `lg:row-start`, the
        tabs take row 1 by auto-placement, and `grid-auto-rows` sizes all three
        to content. No template needed, so no arbitrary track value.
      */}
      <div className="w-full lg:grid">
        <NavigationTabs tabs={tabs} />

        <div className="lg:row-start-3">
          <Cart key="cart" />
        </div>

        {hasSummary ? (
          <div
            // Below lg: byte-for-byte the bar PageShell used to render for this
            // page. At lg: static, content-width, pushed to the right edge.
            className="fixed left-shell-inset right-0 bottom-0 z-sticky w-full max-w-full border-t border-outline-subtle bg-surface px-3 pb-5 lg:static lg:z-auto lg:row-start-2 lg:mb-4 lg:ml-auto lg:w-fit lg:max-w-none lg:border-t-0 lg:px-0 lg:pb-0">
            <div className="flex items-center gap-4">
              <div className="flex flex-col w-24 shrink-0 lg:w-auto">
                <p className="text-foreground-muted line-clamp-1 text-body-sm">
                  Total ({totals.length}):
                </p>
                <p className="font-medium">
                  {formatCurrency(
                    +totals.reduce((a, b) => a + +b.price * +b.quantity, 0)
                  )}
                </p>
              </div>
              <Button
                onClick={handleCheckout}
                loading={isProcessingCheckout}
                className="flex-1 lg:flex-none lg:w-auto lg:mt-0">
                Proceed to checkout
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </PageShell>
  );
};

export default Page;
