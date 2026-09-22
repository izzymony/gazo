/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Banner from "./banner";
import FloatingHeader from "./floatingheader";
import useScroll from "@/hooks/useScroll";
import SearchInput from "@/features/storefront/SearchInput";
import Card, { Cards } from "./ccard";
import Explore from "./explorecard";
import TopVendor from "./topvendor";
import Navicard from "../navigacard";
import { usePathname } from "next/navigation";
import Badge from "@vibaar/ui/common/Badge";

const navLinks = [
  {
    icon: {
      inactive: (
        <svg
          width="37"
          height="36"
          viewBox="0 0 37 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <mask
            id="mask0_4503_235112"
            maskUnits="userSpaceOnUse"
            x="8"
            y="8"
            width="21"
            height="20">
            <rect x="8.44727" y="8" width="20" height="20" fill="#D9D9D9" />
          </mask>
          <g mask="url(#mask0_4503_235112)">
            <path
              d="M15.2189 19.9729C15.589 21.4106 16.8941 22.4729 18.4473 22.4729C20.0005 22.4729 21.3055 21.4106 21.6756 19.9729M17.6287 10.6096L11.9768 15.0055C11.5989 15.2994 11.41 15.4463 11.274 15.6303C11.1534 15.7933 11.0636 15.9769 11.009 16.1722C10.9473 16.3925 10.9473 16.6319 10.9473 17.1105V23.1396C10.9473 24.073 10.9473 24.5397 11.1289 24.8962C11.2887 25.2098 11.5437 25.4648 11.8573 25.6246C12.2138 25.8063 12.6805 25.8063 13.6139 25.8063H23.2806C24.214 25.8063 24.6807 25.8063 25.0373 25.6246C25.3509 25.4648 25.6058 25.2098 25.7656 24.8962C25.9473 24.5397 25.9473 24.073 25.9473 23.1396V17.1105C25.9473 16.6319 25.9473 16.3925 25.8856 16.1722C25.8309 15.9769 25.7411 15.7933 25.6206 15.6303C25.4845 15.4463 25.2956 15.2994 24.9178 15.0055L19.2659 10.6096C18.9731 10.3819 18.8267 10.268 18.6651 10.2243C18.5224 10.1857 18.3721 10.1857 18.2295 10.2243C18.0678 10.268 17.9214 10.3819 17.6287 10.6096Z"
              stroke="white"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M15.2189 19.9729C15.589 21.4106 16.8941 22.4729 18.4473 22.4729C20.0005 22.4729 21.3055 21.4106 21.6756 19.9729M17.6287 10.6096L11.9768 15.0055C11.5989 15.2994 11.41 15.4463 11.274 15.6303C11.1534 15.7933 11.0636 15.9769 11.009 16.1722C10.9473 16.3925 10.9473 16.6319 10.9473 17.1105V23.1396C10.9473 24.073 10.9473 24.5397 11.1289 24.8962C11.2887 25.2098 11.5437 25.4648 11.8573 25.6246C12.2138 25.8063 12.6805 25.8063 13.6139 25.8063H23.2806C24.214 25.8063 24.6807 25.8063 25.0373 25.6246C25.3509 25.4648 25.6058 25.2098 25.7656 24.8962C25.9473 24.5397 25.9473 24.073 25.9473 23.1396V17.1105C25.9473 16.6319 25.9473 16.3925 25.8856 16.1722C25.8309 15.9769 25.7411 15.7933 25.6206 15.6303C25.4845 15.4463 25.2956 15.2994 24.9178 15.0055L19.2659 10.6096C18.9731 10.3819 18.8267 10.268 18.6651 10.2243C18.5224 10.1857 18.3721 10.1857 18.2295 10.2243C18.0678 10.268 17.9214 10.3819 17.6287 10.6096Z"
              stroke="black"
              strokeOpacity="0.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      ),
      active: (
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <mask
            id="mask0_5389_87858"
            maskUnits="userSpaceOnUse"
            x="8"
            y="8"
            width="20"
            height="20">
            <rect x="8" y="8" width="20" height="20" fill="#D9D9D9" />
          </mask>
          <g mask="url(#mask0_5389_87858)">
            <path
              d="M14.7717 19.9729C15.1417 21.4106 16.4468 22.4729 18 22.4729C19.5532 22.4729 20.8583 21.4106 21.2283 19.9729M17.1814 10.6096L11.5295 15.0055C11.1517 15.2994 10.9628 15.4463 10.8267 15.6303C10.7061 15.7933 10.6163 15.9769 10.5617 16.1722C10.5 16.3925 10.5 16.6319 10.5 17.1105V23.1396C10.5 24.073 10.5 24.5397 10.6817 24.8962C10.8414 25.2098 11.0964 25.4648 11.41 25.6246C11.7665 25.8063 12.2332 25.8063 13.1667 25.8063H22.8333C23.7668 25.8063 24.2335 25.8063 24.59 25.6246C24.9036 25.4648 25.1586 25.2098 25.3183 24.8962C25.5 24.5397 25.5 24.073 25.5 23.1396V17.1105C25.5 16.6319 25.5 16.3925 25.4383 16.1722C25.3837 15.9769 25.2939 15.7933 25.1733 15.6303C25.0372 15.4463 24.8483 15.2994 24.4705 15.0055L18.8186 10.6096C18.5258 10.3819 18.3794 10.268 18.2178 10.2243C18.0752 10.1857 17.9248 10.1857 17.7822 10.2243C17.6206 10.268 17.4742 10.3819 17.1814 10.6096Z"
              stroke="var(--brand)"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      ),
    },
    route: "/shop/new",
    tab: "Home",
  },
  {
    icon: {
      active: (
        <svg
          width="37"
          height="36"
          viewBox="0 0 37 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <mask
            id="mask0_4503_235113"
            maskUnits="userSpaceOnUse"
            x="8"
            y="8"
            width="21"
            height="20">
            <rect x="8.44727" y="8" width="20" height="20" fill="#D9D9D9" />
          </mask>
          <g mask="url(#mask0_4503_235113)">
            <path
              d="M10.1608 9.66406H11.2492C11.4543 9.66406 11.5568 9.66406 11.6393 9.70176C11.7119 9.73499 11.7736 9.78842 11.8167 9.85568C11.8657 9.93202 11.8802 10.0335 11.9092 10.2364L12.3036 12.9974M12.3036 12.9974L13.1802 19.4402C13.2914 20.2578 13.3471 20.6666 13.5425 20.9743C13.7147 21.2455 13.9617 21.4611 14.2536 21.5952C14.5848 21.7474 14.9974 21.7474 15.8225 21.7474H22.9541C23.7396 21.7474 24.1323 21.7474 24.4532 21.6061C24.7362 21.4815 24.979 21.2806 25.1543 21.0259C25.3532 20.7371 25.4267 20.3513 25.5737 19.5797L26.6767 13.7888C26.7284 13.5172 26.7543 13.3815 26.7168 13.2753C26.6839 13.1822 26.619 13.1038 26.5337 13.0541C26.4365 12.9974 26.2982 12.9974 26.0218 12.9974H12.3036ZM16.8274 25.4974C16.8274 25.9576 16.4543 26.3307 15.9941 26.3307C15.5339 26.3307 15.1608 25.9576 15.1608 25.4974C15.1608 25.0372 15.5339 24.6641 15.9941 24.6641C16.4543 24.6641 16.8274 25.0372 16.8274 25.4974ZM23.4941 25.4974C23.4941 25.9576 23.121 26.3307 22.6608 26.3307C22.2005 26.3307 21.8274 25.9576 21.8274 25.4974C21.8274 25.0372 22.2005 24.6641 22.6608 24.6641C23.121 24.6641 23.4941 25.0372 23.4941 25.4974Z"
              stroke="var(--brand)"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      ),
      inactive: (
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <mask
            id="mask0_5389_87859"
            maskUnits="userSpaceOnUse"
            x="8"
            y="8"
            width="20"
            height="20">
            <rect x="8" y="8" width="20" height="20" fill="#D9D9D9" />
          </mask>
          <g mask="url(#mask0_5389_87859)">
            <path
              d="M9.7135 9.66406H10.802C11.007 9.66406 11.1095 9.66406 11.192 9.70176C11.2647 9.73499 11.3263 9.78842 11.3695 9.85568C11.4184 9.93202 11.4329 10.0335 11.4619 10.2364L11.8564 12.9974M11.8564 12.9974L12.7329 19.4402C12.8442 20.2578 12.8998 20.6666 13.0953 20.9743C13.2675 21.2455 13.5144 21.4611 13.8063 21.5952C14.1376 21.7474 14.5501 21.7474 15.3753 21.7474H22.5068C23.2923 21.7474 23.685 21.7474 24.006 21.6061C24.289 21.4815 24.5317 21.2806 24.7071 21.0259C24.9059 20.7371 24.9794 20.3513 25.1264 19.5797L26.2294 13.7888C26.2812 13.5172 26.307 13.3815 26.2695 13.2753C26.2367 13.1822 26.1718 13.1038 26.0865 13.0541C25.9892 12.9974 25.851 12.9974 25.5745 12.9974H11.8564ZM16.3802 25.4974C16.3802 25.9576 16.0071 26.3307 15.5468 26.3307C15.0866 26.3307 14.7135 25.9576 14.7135 25.4974C14.7135 25.0372 15.0866 24.6641 15.5468 24.6641C16.0071 24.6641 16.3802 25.0372 16.3802 25.4974ZM23.0468 25.4974C23.0468 25.9576 22.6737 26.3307 22.2135 26.3307C21.7533 26.3307 21.3802 25.9576 21.3802 25.4974C21.3802 25.0372 21.7533 24.6641 22.2135 24.6641C22.6737 24.6641 23.0468 25.0372 23.0468 25.4974Z"
              stroke="white"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9.7135 9.66406H10.802C11.007 9.66406 11.1095 9.66406 11.192 9.70176C11.2647 9.73499 11.3263 9.78842 11.3695 9.85568C11.4184 9.93202 11.4329 10.0335 11.4619 10.2364L11.8564 12.9974M11.8564 12.9974L12.7329 19.4402C12.8442 20.2578 12.8998 20.6666 13.0953 20.9743C13.2675 21.2455 13.5144 21.4611 13.8063 21.5952C14.1376 21.7474 14.5501 21.7474 15.3753 21.7474H22.5068C23.2923 21.7474 23.685 21.7474 24.006 21.6061C24.289 21.4815 24.5317 21.2806 24.7071 21.0259C24.9059 20.7371 24.9794 20.3513 25.1264 19.5797L26.2294 13.7888C26.2812 13.5172 26.307 13.3815 26.2695 13.2753C26.2367 13.1822 26.1718 13.1038 26.0865 13.0541C25.9892 12.9974 25.851 12.9974 25.5745 12.9974H11.8564ZM16.3802 25.4974C16.3802 25.9576 16.0071 26.3307 15.5468 26.3307C15.0866 26.3307 14.7135 25.9576 14.7135 25.4974C14.7135 25.0372 15.0866 24.6641 15.5468 24.6641C16.0071 24.6641 16.3802 25.0372 16.3802 25.4974ZM23.0468 25.4974C23.0468 25.9576 22.6737 26.3307 22.2135 26.3307C21.7533 26.3307 21.3802 25.9576 21.3802 25.4974C21.3802 25.0372 21.7533 24.6641 22.2135 24.6641C22.6737 24.6641 23.0468 25.0372 23.0468 25.4974Z"
              stroke="black"
              strokeOpacity="0.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          <circle cx="25" cy="11" r="4.5" fill="var(--brand)" stroke="white" />
        </svg>
      ),
    },
    route: "/cart",
    tab: "Cart",
    // dynamic: true,
  },
  {
    icon: {
      active: (
        <svg
          width="21"
          height="20"
          viewBox="0 0 21 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <mask
            id="mask0_9296_90351"
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="21"
            height="20">
            <rect x="0.367188" width="20" height="20" fill="#D9D9D9" />
          </mask>
          <g mask="url(#mask0_9296_90351)">
            <path
              d="M6.20052 6.89193H10.3672M6.20052 9.80859H12.8672M6.20052 14.8086V16.7548C6.20052 17.1989 6.20052 17.4209 6.29154 17.5349C6.37071 17.6341 6.49075 17.6918 6.61764 17.6917C6.76354 17.6915 6.93691 17.5528 7.28365 17.2754L9.27153 15.6851C9.67762 15.3603 9.88066 15.1978 10.1068 15.0823C10.3074 14.9798 10.5209 14.9049 10.7415 14.8596C10.9902 14.8086 11.2503 14.8086 11.7703 14.8086H13.8672C15.2673 14.8086 15.9674 14.8086 16.5022 14.5361C16.9726 14.2964 17.355 13.914 17.5947 13.4436C17.8672 12.9088 17.8672 12.2087 17.8672 10.8086V6.30859C17.8672 4.90846 17.8672 4.2084 17.5947 3.67362C17.355 3.20321 16.9726 2.82076 16.5022 2.58108C15.9674 2.30859 15.2673 2.30859 13.8672 2.30859H6.86719C5.46706 2.30859 4.76699 2.30859 4.23221 2.58108C3.76181 2.82076 3.37935 3.20321 3.13967 3.67362C2.86719 4.2084 2.86719 4.90846 2.86719 6.30859V11.4753C2.86719 12.2502 2.86719 12.6377 2.95237 12.9556C3.18354 13.8184 3.85741 14.4922 4.72014 14.7234C5.03806 14.8086 5.42554 14.8086 6.20052 14.8086Z"
              stroke="white"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M6.20052 6.89193H10.3672M6.20052 9.80859H12.8672M6.20052 14.8086V16.7548C6.20052 17.1989 6.20052 17.4209 6.29154 17.5349C6.37071 17.6341 6.49075 17.6918 6.61764 17.6917C6.76354 17.6915 6.93691 17.5528 7.28365 17.2754L9.27153 15.6851C9.67762 15.3603 9.88066 15.1978 10.1068 15.0823C10.3074 14.9798 10.5209 14.9049 10.7415 14.8596C10.9902 14.8086 11.2503 14.8086 11.7703 14.8086H13.8672C15.2673 14.8086 15.9674 14.8086 16.5022 14.5361C16.9726 14.2964 17.355 13.914 17.5947 13.4436C17.8672 12.9088 17.8672 12.2087 17.8672 10.8086V6.30859C17.8672 4.90846 17.8672 4.2084 17.5947 3.67362C17.355 3.20321 16.9726 2.82076 16.5022 2.58108C15.9674 2.30859 15.2673 2.30859 13.8672 2.30859H6.86719C5.46706 2.30859 4.76699 2.30859 4.23221 2.58108C3.76181 2.82076 3.37935 3.20321 3.13967 3.67362C2.86719 4.2084 2.86719 4.90846 2.86719 6.30859V11.4753C2.86719 12.2502 2.86719 12.6377 2.95237 12.9556C3.18354 13.8184 3.85741 14.4922 4.72014 14.7234C5.03806 14.8086 5.42554 14.8086 6.20052 14.8086Z"
              stroke="black"
              strokeOpacity="0.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      ),
      inactive: (
        <svg
          width="21"
          height="20"
          viewBox="0 0 21 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <mask
            id="mask0_9296_90351"
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="21"
            height="20">
            <rect x="0.367188" width="20" height="20" fill="#D9D9D9" />
          </mask>
          <g mask="url(#mask0_9296_90351)">
            <path
              d="M6.20052 6.89193H10.3672M6.20052 9.80859H12.8672M6.20052 14.8086V16.7548C6.20052 17.1989 6.20052 17.4209 6.29154 17.5349C6.37071 17.6341 6.49075 17.6918 6.61764 17.6917C6.76354 17.6915 6.93691 17.5528 7.28365 17.2754L9.27153 15.6851C9.67762 15.3603 9.88066 15.1978 10.1068 15.0823C10.3074 14.9798 10.5209 14.9049 10.7415 14.8596C10.9902 14.8086 11.2503 14.8086 11.7703 14.8086H13.8672C15.2673 14.8086 15.9674 14.8086 16.5022 14.5361C16.9726 14.2964 17.355 13.914 17.5947 13.4436C17.8672 12.9088 17.8672 12.2087 17.8672 10.8086V6.30859C17.8672 4.90846 17.8672 4.2084 17.5947 3.67362C17.355 3.20321 16.9726 2.82076 16.5022 2.58108C15.9674 2.30859 15.2673 2.30859 13.8672 2.30859H6.86719C5.46706 2.30859 4.76699 2.30859 4.23221 2.58108C3.76181 2.82076 3.37935 3.20321 3.13967 3.67362C2.86719 4.2084 2.86719 4.90846 2.86719 6.30859V11.4753C2.86719 12.2502 2.86719 12.6377 2.95237 12.9556C3.18354 13.8184 3.85741 14.4922 4.72014 14.7234C5.03806 14.8086 5.42554 14.8086 6.20052 14.8086Z"
              stroke="white"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M6.20052 6.89193H10.3672M6.20052 9.80859H12.8672M6.20052 14.8086V16.7548C6.20052 17.1989 6.20052 17.4209 6.29154 17.5349C6.37071 17.6341 6.49075 17.6918 6.61764 17.6917C6.76354 17.6915 6.93691 17.5528 7.28365 17.2754L9.27153 15.6851C9.67762 15.3603 9.88066 15.1978 10.1068 15.0823C10.3074 14.9798 10.5209 14.9049 10.7415 14.8596C10.9902 14.8086 11.2503 14.8086 11.7703 14.8086H13.8672C15.2673 14.8086 15.9674 14.8086 16.5022 14.5361C16.9726 14.2964 17.355 13.914 17.5947 13.4436C17.8672 12.9088 17.8672 12.2087 17.8672 10.8086V6.30859C17.8672 4.90846 17.8672 4.2084 17.5947 3.67362C17.355 3.20321 16.9726 2.82076 16.5022 2.58108C15.9674 2.30859 15.2673 2.30859 13.8672 2.30859H6.86719C5.46706 2.30859 4.76699 2.30859 4.23221 2.58108C3.76181 2.82076 3.37935 3.20321 3.13967 3.67362C2.86719 4.2084 2.86719 4.90846 2.86719 6.30859V11.4753C2.86719 12.2502 2.86719 12.6377 2.95237 12.9556C3.18354 13.8184 3.85741 14.4922 4.72014 14.7234C5.03806 14.8086 5.42554 14.8086 6.20052 14.8086Z"
              stroke="black"
              strokeOpacity="0.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      ),
    },
    route: "/inbox",
    tab: "Inbox",
    // dynamic: true,
  },
  {
    icon: {
      active: (
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <path
            d="M21.3346 13.8333C21.3346 15.6743 19.8423 17.1667 18.0013 17.1667C16.1604 17.1667 14.668 15.6743 14.668 13.8333C14.668 11.9924 16.1604 10.5 18.0013 10.5C19.8423 10.5 21.3346 11.9924 21.3346 13.8333Z"
            stroke="var(--brand)"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18.0013 19.6667C14.7796 19.6667 12.168 22.2783 12.168 25.5H23.8346C23.8346 22.2783 21.223 19.6667 18.0013 19.6667Z"
            stroke="var(--brand)"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      inactive: (
        <svg
          width="37"
          height="36"
          viewBox="0 0 37 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <path
            d="M21.7819 13.8333C21.7819 15.6743 20.2895 17.1667 18.4486 17.1667C16.6076 17.1667 15.1152 15.6743 15.1152 13.8333C15.1152 11.9924 16.6076 10.5 18.4486 10.5C20.2895 10.5 21.7819 11.9924 21.7819 13.8333Z"
            stroke="white"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M21.7819 13.8333C21.7819 15.6743 20.2895 17.1667 18.4486 17.1667C16.6076 17.1667 15.1152 15.6743 15.1152 13.8333C15.1152 11.9924 16.6076 10.5 18.4486 10.5C20.2895 10.5 21.7819 11.9924 21.7819 13.8333Z"
            stroke="black"
            strokeOpacity="0.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18.4486 19.6667C15.2269 19.6667 12.6152 22.2783 12.6152 25.5H24.2819C24.2819 22.2783 21.6702 19.6667 18.4486 19.6667Z"
            stroke="white"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18.4486 19.6667C15.2269 19.6667 12.6152 22.2783 12.6152 25.5H24.2819C24.2819 22.2783 21.6702 19.6667 18.4486 19.6667Z"
            stroke="black"
            strokeOpacity="0.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    route: "/profile",
    tab: "Profile",
  },
];

export default function Shop({
  show,
  setShow,
}: {
  show: string;
  setShow: (val: string) => void;
}) {
  const [isSticky, setIsSticky] = useState(false);
  const { isScrolled, scrollRef } = useScroll(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState(false);
  const [selected, setSelected] = useState<any>({});
  const [liked, setLiked] = useState(false);
  const categories: any = [];
  const pathName = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      const threshold = 10; // Adjust based on your HeaderSlides height
      if (window.scrollY >= threshold) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="h-screen relative w-screen max-w-[1050px] bg-surface justify-between flex flex-col">
      <div className="h-16 ">
        <FloatingHeader show={show} setShow={setShow} />
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-scroll scrollbar-hide">
        <div className="px-3">
          <Banner />
        </div>
        {!isScrolled && (
          <div className="px-3">
            <SearchInput
              showSearch={true}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              action={() => {
                setSearch(!search);
                setSearchTerm("");
              }}
            />
          </div>
        )}
        <div className="gap-2 w-full px-3 flex items-center bg-surface sticky top-0 z-30 border-b">
          {!search && !searchTerm ? (
            <div className="gap-2 py-1 w-full flex items-center">
              <div className="flex flex-1 gap-2 items-center my-2 overflow-x-scroll scrollbar-hide">
                {categories.map((it: any) => (
                  <div
                    onClick={() => setSelected(selected.id ? {} : it)}
                    key={it.id}
                    className={
                      it.name === selected.name
                        ? "py-2 px-4 bg-black rounded-full text-white text-body-sm font-medium cursor-pointer relative flex flex-row items-center gap-3"
                        : "py-2 px-4 bg-surface-subtle rounded-full text-black text-body-sm font-medium cursor-pointer relative flex flex-row items-center gap-3"
                    }>
                    <p className="whitespace-nowrap">{it.name}</p>
                    {it.name === selected.name && (
                      <div
                        className="z-[99999] cursor-pointer"
                        onClick={() => setSelected({})}>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M11 1L1 11M1 1L11 11"
                            stroke="white"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {isScrolled && (
                <div
                  className="py-2 px-2 bg-surface-subtle rounded-full text-black text-body-sm font-medium cursor-pointer relative flex flex-row items-center gap-3"
                  onClick={() => setSearch(!search)}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M15.5 15.5L11.875 11.875M13.8333 7.16667C13.8333 10.8486 10.8486 13.8333 7.16667 13.8333C3.48477 13.8333 0.5 10.8486 0.5 7.16667C0.5 3.48477 3.48477 0.5 7.16667 0.5C10.8486 0.5 13.8333 3.48477 13.8333 7.16667Z"
                      stroke="white"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M15.5 15.5L11.875 11.875M13.8333 7.16667C13.8333 10.8486 10.8486 13.8333 7.16667 13.8333C3.48477 13.8333 0.5 10.8486 0.5 7.16667C0.5 3.48477 3.48477 0.5 7.16667 0.5C10.8486 0.5 13.8333 3.48477 13.8333 7.16667Z"
                      stroke="black"
                      strokeOpacity="0.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          ) : search && isScrolled ? (
            <SearchInput
              showSearch={true}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              action={() => {
                setSearch(!search);
                setSearchTerm("");
              }}
            />
          ) : (
            <div className="gap-2 py-1 w-full flex items-center">
              <div className="flex flex-1 gap-2 items-center my-2 overflow-x-scroll scrollbar-hide">
                {categories.map((it: any) => (
                  <div
                    onClick={() => setSelected(selected.id ? {} : it)}
                    key={it.id}
                    className={
                      it.name === selected.name
                        ? "py-2 px-4 bg-black rounded-full text-white text-body-sm font-medium cursor-pointer relative flex flex-row items-center gap-3"
                        : "py-2 px-4 bg-surface-subtle rounded-full text-black text-body-sm font-medium cursor-pointer relative flex flex-row items-center gap-3"
                    }>
                    <p className="whitespace-nowrap">{it.name}</p>
                    {it.name === selected.name && (
                      <div
                        className="z-[99999] cursor-pointer"
                        onClick={() => setSelected({})}>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M11 1L1 11M1 1L11 11"
                            stroke="white"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {isScrolled && (
                <div
                  className="py-2 px-2 bg-surface-subtle rounded-full text-black text-body-sm font-medium cursor-pointer relative flex flex-row items-center gap-3"
                  onClick={() => setSearch(!search)}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M15.5 15.5L11.875 11.875M13.8333 7.16667C13.8333 10.8486 10.8486 13.8333 7.16667 13.8333C3.48477 13.8333 0.5 10.8486 0.5 7.16667C0.5 3.48477 3.48477 0.5 7.16667 0.5C10.8486 0.5 13.8333 3.48477 13.8333 7.16667Z"
                      stroke="white"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M15.5 15.5L11.875 11.875M13.8333 7.16667C13.8333 10.8486 10.8486 13.8333 7.16667 13.8333C3.48477 13.8333 0.5 10.8486 0.5 7.16667C0.5 3.48477 3.48477 0.5 7.16667 0.5C10.8486 0.5 13.8333 3.48477 13.8333 7.16667Z"
                      stroke="black"
                      strokeOpacity="0.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          )}
        </div>
        <Explore title="⚡️ Trending Hot items">
          <div className="overflow-y-scroll scrollbar-hide flex flex-row">
            {[1, 2, 3, 4, 5, 6, 7].map((it) => (
              <Card key={it} liked={liked} setLiked={setLiked} />
            ))}
          </div>
        </Explore>
        <Explore title="New Arrival">
          <div className="overflow-y-scroll scrollbar-hide flex flex-row">
            {[1, 2, 3, 4, 5, 6, 7].map((it) => (
              <Card key={it} liked={liked} setLiked={setLiked} />
            ))}
          </div>
        </Explore>
        <Explore title="🚀 Top selling Vendors">
          <div className="flex flex-row w-full flex-wrap">
            {[1, 2, 3, 4].map((it) => (
              <TopVendor key={it} />
            ))}
          </div>
        </Explore>
        <Explore title="Curated categories">
          <div className="overflow-x-scroll scrollbar-hide flex flex-row">
            {[1, 2, 3, 4, 5, 6, 7].map((it) => (
              <div key={it} className="p-1">
                <div className="w-[140px] relative overflow-hidden rounded-[10px] bg-[#4C94FF] pt-2 z-50">
                  <div className="w-full py-2 px-4 rounded-t-full bg-[#03030348] z-[1px]">
                    <div className="gap-1 flex flex-col z-50">
                      <div className="flex justify-between">
                        <Badge tone="brand" variant="solid" className="tracking-wider">
                          Deals
                        </Badge>
                      </div>
                      <p className=" line-clamp-2 text-white font-medium text-body-sm">
                        What you see is what you get
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Explore>
        <div className="py-3 ps-2 bg-black mb-5">
          <Explore tik={true} title="Trending on socials">
            <div className="overflow-y-scroll scrollbar-hide flex flex-row">
              {[1, 2, 3, 4, 5, 6, 7].map((it) => (
                <Card tik={true} key={it} liked={liked} setLiked={setLiked} />
              ))}
            </div>
          </Explore>
        </div>
        <Explore title="Exclusive picks for you">
          <div className="flex flex-row flex-wrap w-full">
            {[1, 2, 3, 4, 5, 6, 7].map((it) => (
              <div key={it} className="w-1/2">
                <Cards liked={liked} setLiked={setLiked} />
              </div>
            ))}
          </div>
        </Explore>
      </div>
      <div className="flex items-center justify-between">
        {navLinks.map((it) => (
          <Navicard
            key={it.route}
            icon={pathName === it.route ? it.icon.active : it.icon.inactive}
            tab={it.tab}
            active={pathName === it.route}
            route={it.route}
          />
        ))}
      </div>
    </div>
  );
}
