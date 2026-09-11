"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@vibaar/utils";
import BrandLogo from "@vibaar/ui/common/BrandLogo";
import SearchField from "@vibaar/ui/common/SearchField";
import ChipToggle from "@vibaar/ui/common/ChipToggle";
import NavItem from "@vibaar/ui/common/NavItem";
import SlideDots from "@vibaar/ui/common/SlideDots";
import { ShoppingCart, Package, User } from "@vibaar/ui/icons";

export const MARKETPLACE_SLIDES = [
  "One stop platform for all your social media shopping",
  "Shop directly from your favorite social media accounts",
  "Fast, reliable, and secure shopping experience",
  "Connecting you to the best social media deals",
];

export interface MarketplaceCategory {
  id: string;
  name: string;
}

export interface MarketplaceHeaderProps {
  /** Rotating band headlines. */
  slides?: string[];
  /**
   * `tint` is the pale band (brand-200); `brand` is the saturated ribbon the
   * marketplace ships today. Same composition, different ground.
   */
  tone?: "tint" | "brand";
  searchValue: string;
  onSearchChange: (value: string) => void;
  /** Enter in the search field. */
  onSearchSubmit?: () => void;
  categories?: MarketplaceCategory[];
  /** The selected category's NAME, or undefined for "all". */
  selectedCategory?: string;
  /** Receives the name, or null when the shopper clears the selection. */
  onSelectCategory?: (name: string | null) => void;
  /** Desktop bar only — the count on the cart destination. */
  cartCount?: number;
  /**
   * Past the scroll threshold. The band collapses; search and categories stay.
   * The shipped header does the opposite — it removes the SEARCH on scroll and
   * keeps the categories, so the one control a marketplace exists for is the
   * one that goes away the moment you start looking.
   */
  collapsed?: boolean;
  /** Rotation interval, ms. 0 stops it (also stopped by prefers-reduced-motion). */
  interval?: number;
  className?: string;
}

const TONE = {
  tint: "bg-brand-200",
  brand: "bg-brand",
} as const;

/** Desktop destinations. The buyer has none at `lg` today: VendorNav is `lg:hidden`
 *  and nothing replaces it, so cart, orders and profile are reachable only by URL. */
const DESKTOP_NAV = [
  { href: "/cart", label: "Cart", icon: ShoppingCart, counted: true },
  { href: "/orders", label: "Orders", icon: Package, counted: false },
  { href: "/profile", label: "Profile", icon: User, counted: false },
];

/**
 * MarketplaceHeader — the buyer marketplace's header, as one component.
 *
 * It was not a component. It was ~60 lines inline in `(buyer)/shop/page.tsx`:
 * a brand band, a rounded sheet pulled up over it, `SearchInput` rendered
 * TWICE (once for `!isScrolled`, once for `search && isScrolled`) and a chip
 * row — so every other marketplace surface that wanted the same header drew its
 * own, and none of it could be reviewed anywhere.
 *
 * THE MARK. The band's mark was the old Instashop logo. Its path data is
 * byte-identical to the dead `public/instashop.svg` — hand-inlined into
 * `HeaderSlides`, then recoloured from the old pink to `var(--brand)`, which is
 * precisely why it passed the colour gates, the tokens contract and the drift
 * ratchet while being the wrong logo. Here the lockup is `BrandLogo` and the
 * watermark is `/brand/icon-watermark.svg`: both resolve to files in
 * `public/brand/`, so a rebrand cannot miss them.
 *
 * DESKTOP. Every header in this app is a mobile composition with `lg:max-w-5xl`
 * bolted on — `SearchInput` and the seller hero contain no breakpoint prefixes
 * at all. From `lg` this one is a different arrangement, not a wider one: an app
 * bar carrying the mark and the buyer's destinations sits above the band, and the
 * search shares a row with the category chips instead of stacking above them.
 * That bar is also the only navigation a desktop buyer gets — `VendorNav` is
 * `lg:hidden` and nothing replaces it, so cart, orders and profile are reachable
 * today only by typing the URL.
 *
 * ONE search field, at every width. Not a detail: the shipped header mounts
 * `SearchInput` twice and picks between them with `isScrolled`, and the first
 * draft of THIS component did the same thing — a field in the bar and a field
 * in the sheet, one of them merely hidden by CSS. Two inputs in the tree are two
 * tab stops and two things announced, whatever the viewport shows.
 *
 * Presentational on purpose — no stores, no router reads — so it renders in the
 * playground and its states are reviewable without signing in.
 */
export default function MarketplaceHeader({
  slides = MARKETPLACE_SLIDES,
  tone = "tint",
  searchValue,
  onSearchChange,
  onSearchSubmit,
  categories = [],
  selectedCategory,
  onSelectCategory,
  cartCount = 0,
  collapsed = false,
  interval = 4000,
  className,
}: MarketplaceHeaderProps) {
  const [active, setActive] = useState(0);
  // Rotation pauses while a pointer rests on the band, and never starts at all
  // under prefers-reduced-motion. The shipped carousel does neither: a 3s
  // setInterval that cannot be stopped, on text you may still be reading.
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!interval || paused || slides.length < 2) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    timer.current = setInterval(
      () => setActive((current) => (current + 1) % slides.length),
      interval
    );
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [interval, paused, slides.length]);

  // A slide index that outlives its slide set would render nothing.
  useEffect(() => {
    setActive((current) => (current >= slides.length ? 0 : current));
  }, [slides.length]);

  // Rendered once and placed by the layout — never branched per breakpoint.
  const search = (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearchSubmit?.();
      }}>
      <SearchField
        value={searchValue}
        onChange={onSearchChange}
        placeholder="Enter a vendor name"
        ariaLabel="Search vendors"
        // A pill, and tall enough to be the page's primary control. The shipped
        // field is a hand-rolled div with a literal "X" character for its clear
        // button and an off-scale `text-sm`; this is the design-system field.
        className="h-12 rounded-pill pl-11"
      />
    </form>
  );

  // `min-w-0` is what lets the row SCROLL rather than widen: without it a flex
  // item's automatic minimum size is its content, so the chips push the whole
  // header past the viewport instead of overflowing inside themselves.
  const chips = categories.length > 0 && (
    <div
      className="-mx-4 flex min-w-0 gap-2 overflow-x-auto scrollbar-hide px-4 md:-mx-6 md:px-6 lg:mx-0 lg:flex-1 lg:flex-wrap lg:overflow-visible lg:px-0"
      role="group"
      aria-label="Filter by category">
      {categories.map((category) => {
        const selected = category.name === selectedCategory;
        return (
          <ChipToggle
            key={category.id}
            selected={selected}
            onClick={() => onSelectCategory?.(selected ? null : category.name)}>
            {category.name}
          </ChipToggle>
        );
      })}
    </div>
  );

  return (
    <header className={cn("relative isolate w-full", className)}>
      {/* ---------------------------------------------------------------
          Desktop app bar. `lg` and up only — below that the band's own
          search is the whole control surface and a second bar would be
          two search fields again, which is the bug this replaces.
          --------------------------------------------------------------- */}
      <div className="hidden border-b border-outline bg-surface lg:block">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-6 px-5">
          <Link
            href="/shop"
            aria-label="Vibaar — marketplace home"
            className="shrink-0">
            {/* alt="" — the link above already names the destination. */}
            <BrandLogo width={108} alt="" />
          </Link>

          <nav
            aria-label="Your account"
            className="ml-auto flex shrink-0 items-center gap-1">
            {DESKTOP_NAV.map(({ href, label, icon: Icon, counted }) => (
              <NavItem
                key={href}
                href={href}
                label={label}
                showLabel
                variant="rail"
                icon={<Icon size={20} />}
                badge={counted ? cartCount : undefined}
                badgeLabel={counted ? "items in cart" : undefined}
                // `rail` is the sidebar row, so it is w-full by default.
                className="w-auto px-3 py-2"
              />
            ))}
          </nav>
        </div>
      </div>

      {/* ---------------------------------------------------------------
          Brand band. Collapses to nothing past the scroll threshold via
          grid-template-rows, so there is no height to keep in sync with a
          magic number somewhere else.
          --------------------------------------------------------------- */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          TONE[tone],
          collapsed ? "grid-rows-collapsed" : "grid-rows-expanded"
        )}>
        <div className="overflow-hidden">
          <div
            // The right padding RESERVES the watermark's column, so the
            // headline and dots clear it by construction and the reservation
            // scales with the mark instead of being a max-width guessed once
            // against one phone.
            className="relative mx-auto max-w-5xl px-4 pb-10 pr-32 pt-5 md:px-6 md:pr-44 lg:px-5 lg:pb-8 lg:pr-72 lg:pt-7"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}>
            {/* The mark, bleeding past the content column. Anchored to the
                column rather than the viewport so its distance from the
                headline is the same at 390px and at 1920px. */}
            <Image
              src="/brand/icon-watermark.svg"
              alt=""
              aria-hidden="true"
              width={999}
              height={781}
              priority
              className="pointer-events-none absolute -right-6 top-1/2 w-40 -translate-y-1/2 select-none md:w-52 lg:-right-10 lg:w-64"
            />

            <p className="relative text-h2 font-medium text-brandInk lg:text-h1">
              {slides[active]}
            </p>

            <SlideDots
              count={slides.length}
              active={active}
              onSelect={setActive}
              itemLabel="message"
              tone="onBrand"
              className="relative mt-1"
            />
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------
          The sheet. Rides up over the band's bottom padding, which is what
          gives the rounded top something to sit against.
          --------------------------------------------------------------- */}
      <div
        className={cn(
          "relative rounded-t-panel bg-surface transition-spacing duration-300 ease-out",
          // The lift only makes sense while there is a band to lift over. Left
          // on through the collapse it pulls the sheet above the header's own
          // top edge and clips the search field.
          collapsed ? "mt-0" : "-mt-6 lg:-mt-5"
        )}>
        <div className="mx-auto max-w-5xl px-4 pb-2 pt-3 md:px-6 lg:px-5 lg:pt-4">
          {/* ONE search field, at every width. It pairs with the category
              chips because they do the same job — narrowing the feed — so on
              desktop they share a row rather than the search jumping into the
              bar above and leaving a second input mounted below it. */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            <div className="lg:w-80 lg:shrink-0">{search}</div>
            {chips}
          </div>
        </div>
      </div>
    </header>
  );
}
