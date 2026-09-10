"use client";

import { cn } from "@vibaar/utils";
import { focusRing } from "../../styles";

import dynamic from "next/dynamic";

// Lazy-load: ExpandableIconMenu pulls in framer-motion, and this menu lives in
// the storefront headers — keeping framer-motion out of that bundle. (Perf P3.)
const ExpandableIconMenu = dynamic(() => import("../../slidingcomponent"), { ssr: false });

interface KebabMenuStore {
  instagram_profile?: string | null;
  tiktok_profile?: string | null;
  facebook_profile?: string | null;
  whatsapp_profile?: string | null;
  x_profile?: string | null;
}

interface KebabMenuProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  /** Store object whose social profile fields drive the expandable menu */
  store?: KebabMenuStore | null;
}

/**
 * ExpandableIconMenu + kebab (vertical dots) toggle cluster.
 * Extracted verbatim from SmallHeader + VendorHeader (W3.7 Phase 2) — the
 * inner `flex items-center ml-2 gap-1` block was byte-for-byte identical in
 * both (callers keep their own outer wrappers).
 */
const KebabMenu = ({ isOpen, setIsOpen, store }: KebabMenuProps) => (
  <div className="flex items-center ml-2 gap-1">
    <ExpandableIconMenu
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      socialProfiles={{
        instagram: store?.instagram_profile || "",
        tiktok: store?.tiktok_profile || "",
        facebook: store?.facebook_profile || "",
        whatsapp: store?.whatsapp_profile || "",
        x: store?.x_profile || ""
      }}
    />
    {/* Was a <div onClick>: not focusable, no role, and ignoring Enter and
        Space — so the storefront overflow menu was mouse-only. It also
        declared no expanded state, unlike DropdownMenu which does the same job
        with full semantics. */}
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      aria-label={isOpen ? "Close store menu" : "Open store menu"}
      aria-haspopup="menu"
      aria-expanded={isOpen}
      className={cn("rounded-full", focusRing)}>
      <svg
        width="36"
        height="37"
        viewBox="0 0 36 37"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <rect
          y="0.320312"
          width="36"
          height="36"
          rx="18"
          fill="black"
          fillOpacity="0.03"
        />
        <mask
          id="mask0_7046_239079"
          maskUnits="userSpaceOnUse"
          x="8"
          y="8"
          width="20"
          height="21">
          {/* Luminance mask — see BackButton. `currentColor` inherited the dark
              header text colour and hid the dots. */}
          <rect x="8" y="8.32031" width="20" height="20" fill="white" />
        </mask>
        <g mask="url(#mask0_7046_239079)">
          <path
            d="M17.9956 24.3203C17.5819 24.3203 17.2292 24.173 16.9375 23.8784C16.6458 23.5839 16.5 23.2297 16.5 22.8159C16.5 22.4022 16.6473 22.0495 16.9419 21.7578C17.2365 21.4661 17.5906 21.3203 18.0044 21.3203C18.4181 21.3203 18.7708 21.4676 19.0625 21.7622C19.3542 22.0568 19.5 22.4109 19.5 22.8247C19.5 23.2384 19.3527 23.5911 19.0581 23.8828C18.7635 24.1745 18.4094 24.3203 17.9956 24.3203ZM17.9956 19.8203C17.5819 19.8203 17.2292 19.673 16.9375 19.3784C16.6458 19.0839 16.5 18.7297 16.5 18.3159C16.5 17.9022 16.6473 17.5495 16.9419 17.2578C17.2365 16.9661 17.5906 16.8203 18.0044 16.8203C18.4181 16.8203 18.7708 16.9676 19.0625 17.2622C19.3542 17.5568 19.5 17.9109 19.5 18.3247C19.5 18.7384 19.3527 19.0911 19.0581 19.3828C18.7635 19.6745 18.4094 19.8203 17.9956 19.8203ZM17.9956 15.3203C17.5819 15.3203 17.2292 15.173 16.9375 14.8784C16.6458 14.5839 16.5 14.2297 16.5 13.8159C16.5 13.4022 16.6473 13.0495 16.9419 12.7578C17.2365 12.4661 17.5906 12.3203 18.0044 12.3203C18.4181 12.3203 18.7708 12.4676 19.0625 12.7622C19.3542 13.0568 19.5 13.4109 19.5 13.8247C19.5 14.2384 19.3527 14.5911 19.0581 14.8828C18.7635 15.1745 18.4094 15.3203 17.9956 15.3203Z"
            fill="white"
          />
        </g>
      </svg>
    </button>
  </div>
);

export default KebabMenu;
