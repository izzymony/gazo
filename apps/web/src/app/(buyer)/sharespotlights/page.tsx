/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { navLinks } from "@/features/shop/spotlightNav";
import Navicard from "@/features/shop/navigacard";
import FluidCard from "@/features/shop/fluidcard";
import Image from "next/image";
import { Modall } from "@/features/seller-shell/sales";
import Link from "next/link";

export default function Page() {
  const pathName = usePathname();
  const [liked, setLiked] = useState(false);
  const [like, setLike] = useState("Recents");
  const router = useRouter();
  const [next, setNext] = useState(1);
  const [show, setShow] = useState(false);

  return next === 1 ? (
    <div className="h-full relative w-full max-w-[450px] bg-surface  flex flex-col">
      <button type="button"
        onClick={() => router.back()}
        className="text-left flex mt-3 gap-2 items-center text-black text-body-lg font-medium tracking-wider">
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <mask
            id="mask0_9897_85754"
            style={{ maskType: "alpha" }}
            maskUnits="userSpaceOnUse"
            x="8"
            y="8"
            width="20"
            height="20">
            <rect x="8" y="8" width="20" height="20" fill="#D9D9D9" />
          </mask>
          <g mask="url(#mask0_9897_85754)">
            <path
              d="M23.832 18.0003H12.1654M12.1654 18.0003L17.9987 12.167M12.1654 18.0003L17.9987 23.8337"
              stroke="white"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M23.832 18.0003H12.1654M12.1654 18.0003L17.9987 12.167M12.1654 18.0003L17.9987 23.8337"
              stroke="black"
              strokeOpacity="0.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
        Share a spotlight
      </button>
      <div className="flex gap-3  mt-4 px-3">
        {["Recents", "Photos", "Videos"].map((it) => (
          <div
            key={it}
            className={
              like === it
                ? "flex gap-2 items-center text-[#ffffff99] text-body-lg font-normal tracking-wider rounded-full py-2 px-4 bg-[#000000]"
                : "flex gap-2 items-center text-foreground-secondary text-body-lg font-normal tracking-wider rounded-full py-2 px-4 bg-surface-subtle"
            }>
            <div>
              {it === "Videos" ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <mask
                    id="mask0_9897_89406"
                    // style="mask-type:alpha"
                    maskUnits="userSpaceOnUse"
                    x="0"
                    y="0"
                    width="20"
                    height="20">
                    <rect width="20" height="20" fill="#D9D9D9" />
                  </mask>
                  <g mask="url(#mask0_9897_89406)">
                    <path
                      d="M10.3333 18.6667C14.9357 18.6667 18.6667 14.9357 18.6667 10.3333C18.6667 5.73096 14.9357 2 10.3333 2C5.73096 2 2 5.73096 2 10.3333C2 14.9357 5.73096 18.6667 10.3333 18.6667Z"
                      stroke="white"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10.3333 18.6667C14.9357 18.6667 18.6667 14.9357 18.6667 10.3333C18.6667 5.73096 14.9357 2 10.3333 2C5.73096 2 2 5.73096 2 10.3333C2 14.9357 5.73096 18.6667 10.3333 18.6667Z"
                      stroke="black"
                      strokeOpacity="0.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8.25 7.80444C8.25 7.40671 8.25 7.20784 8.33312 7.09681C8.40555 7.00006 8.51643 6.93953 8.63698 6.93092C8.77532 6.92104 8.9426 7.02858 9.27717 7.24366L13.211 9.77255C13.5013 9.95918 13.6465 10.0525 13.6966 10.1712C13.7404 10.2748 13.7404 10.3918 13.6966 10.4955C13.6465 10.6142 13.5013 10.7075 13.211 10.8941L9.27717 13.423C8.9426 13.6381 8.77532 13.7456 8.63698 13.7357C8.51643 13.7271 8.40555 13.6666 8.33312 13.5699C8.25 13.4588 8.25 13.26 8.25 12.8622V7.80444Z"
                      stroke="white"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8.25 7.80444C8.25 7.40671 8.25 7.20784 8.33312 7.09681C8.40555 7.00006 8.51643 6.93953 8.63698 6.93092C8.77532 6.92104 8.9426 7.02858 9.27717 7.24366L13.211 9.77255C13.5013 9.95918 13.6465 10.0525 13.6966 10.1712C13.7404 10.2748 13.7404 10.3918 13.6966 10.4955C13.6465 10.6142 13.5013 10.7075 13.211 10.8941L9.27717 13.423C8.9426 13.6381 8.77532 13.7456 8.63698 13.7357C8.51643 13.7271 8.40555 13.6666 8.33312 13.5699C8.25 13.4588 8.25 13.26 8.25 12.8622V7.80444Z"
                      stroke="black"
                      strokeOpacity="0.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                </svg>
              ) : it === "Photos" ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <mask
                    id="mask0_9897_77839"
                    maskUnits="userSpaceOnUse"
                    x="0"
                    y="0"
                    width="20"
                    height="20">
                    <rect width="20" height="20" fill="#D9D9D9" />
                  </mask>
                  <g mask="url(#mask0_9897_77839)">
                    <path
                      d="M3.89341 16.7733L9.39053 11.2761C9.72054 10.9461 9.88555 10.7811 10.0758 10.7193C10.2432 10.6649 10.4235 10.6649 10.5908 10.7193C10.7811 10.7811 10.9461 10.9461 11.2761 11.2761L16.7366 16.7366M12 12L14.3905 9.60948C14.7205 9.27946 14.8855 9.11445 15.0758 9.05263C15.2432 8.99825 15.4235 8.99825 15.5908 9.05263C15.7811 9.11445 15.9461 9.27946 16.2761 9.60947L18.6667 12M8.66667 7C8.66667 7.92047 7.92047 8.66667 7 8.66667C6.07953 8.66667 5.33333 7.92047 5.33333 7C5.33333 6.07953 6.07953 5.33333 7 5.33333C7.92047 5.33333 8.66667 6.07953 8.66667 7ZM6 17H14.6667C16.0668 17 16.7669 17 17.3016 16.7275C17.772 16.4878 18.1545 16.1054 18.3942 15.635C18.6667 15.1002 18.6667 14.4001 18.6667 13V6C18.6667 4.59987 18.6667 3.8998 18.3942 3.36502C18.1545 2.89462 17.772 2.51217 17.3016 2.27248C16.7669 2 16.0668 2 14.6667 2H6C4.59987 2 3.8998 2 3.36502 2.27248C2.89462 2.51217 2.51217 2.89462 2.27248 3.36502C2 3.8998 2 4.59987 2 6V13C2 14.4001 2 15.1002 2.27248 15.635C2.51217 16.1054 2.89462 16.4878 3.36502 16.7275C3.8998 17 4.59987 17 6 17Z"
                      stroke="white"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M3.89341 16.7733L9.39053 11.2761C9.72054 10.9461 9.88555 10.7811 10.0758 10.7193C10.2432 10.6649 10.4235 10.6649 10.5908 10.7193C10.7811 10.7811 10.9461 10.9461 11.2761 11.2761L16.7366 16.7366M12 12L14.3905 9.60948C14.7205 9.27946 14.8855 9.11445 15.0758 9.05263C15.2432 8.99825 15.4235 8.99825 15.5908 9.05263C15.7811 9.11445 15.9461 9.27946 16.2761 9.60947L18.6667 12M8.66667 7C8.66667 7.92047 7.92047 8.66667 7 8.66667C6.07953 8.66667 5.33333 7.92047 5.33333 7C5.33333 6.07953 6.07953 5.33333 7 5.33333C7.92047 5.33333 8.66667 6.07953 8.66667 7ZM6 17H14.6667C16.0668 17 16.7669 17 17.3016 16.7275C17.772 16.4878 18.1545 16.1054 18.3942 15.635C18.6667 15.1002 18.6667 14.4001 18.6667 13V6C18.6667 4.59987 18.6667 3.8998 18.3942 3.36502C18.1545 2.89462 17.772 2.51217 17.3016 2.27248C16.7669 2 16.0668 2 14.6667 2H6C4.59987 2 3.8998 2 3.36502 2.27248C2.89462 2.51217 2.51217 2.89462 2.27248 3.36502C2 3.8998 2 4.59987 2 6V13C2 14.4001 2 15.1002 2.27248 15.635C2.51217 16.1054 2.89462 16.4878 3.36502 16.7275C3.8998 17 4.59987 17 6 17Z"
                      stroke="black"
                      strokeOpacity="0.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <mask
                    id="mask0_9897_77839"
                    // style="mask-type:alpha"
                    maskUnits="userSpaceOnUse"
                    x="0"
                    y="0"
                    width="20"
                    height="20">
                    <rect width="20" height="20" fill="#D9D9D9" />
                  </mask>
                  <g mask="url(#mask0_9897_77839)">
                    <path
                      d="M3.89341 16.7733L9.39053 11.2761C9.72054 10.9461 9.88555 10.7811 10.0758 10.7193C10.2432 10.6649 10.4235 10.6649 10.5908 10.7193C10.7811 10.7811 10.9461 10.9461 11.2761 11.2761L16.7366 16.7366M12 12L14.3905 9.60948C14.7205 9.27946 14.8855 9.11445 15.0758 9.05263C15.2432 8.99825 15.4235 8.99825 15.5908 9.05263C15.7811 9.11445 15.9461 9.27946 16.2761 9.60947L18.6667 12M8.66667 7C8.66667 7.92047 7.92047 8.66667 7 8.66667C6.07953 8.66667 5.33333 7.92047 5.33333 7C5.33333 6.07953 6.07953 5.33333 7 5.33333C7.92047 5.33333 8.66667 6.07953 8.66667 7ZM6 17H14.6667C16.0668 17 16.7669 17 17.3016 16.7275C17.772 16.4878 18.1545 16.1054 18.3942 15.635C18.6667 15.1002 18.6667 14.4001 18.6667 13V6C18.6667 4.59987 18.6667 3.8998 18.3942 3.36502C18.1545 2.89462 17.772 2.51217 17.3016 2.27248C16.7669 2 16.0668 2 14.6667 2H6C4.59987 2 3.8998 2 3.36502 2.27248C2.89462 2.51217 2.51217 2.89462 2.27248 3.36502C2 3.8998 2 4.59987 2 6V13C2 14.4001 2 15.1002 2.27248 15.635C2.51217 16.1054 2.89462 16.4878 3.36502 16.7275C3.8998 17 4.59987 17 6 17Z"
                      stroke="white"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M3.89341 16.7733L9.39053 11.2761C9.72054 10.9461 9.88555 10.7811 10.0758 10.7193C10.2432 10.6649 10.4235 10.6649 10.5908 10.7193C10.7811 10.7811 10.9461 10.9461 11.2761 11.2761L16.7366 16.7366M12 12L14.3905 9.60948C14.7205 9.27946 14.8855 9.11445 15.0758 9.05263C15.2432 8.99825 15.4235 8.99825 15.5908 9.05263C15.7811 9.11445 15.9461 9.27946 16.2761 9.60947L18.6667 12M8.66667 7C8.66667 7.92047 7.92047 8.66667 7 8.66667C6.07953 8.66667 5.33333 7.92047 5.33333 7C5.33333 6.07953 6.07953 5.33333 7 5.33333C7.92047 5.33333 8.66667 6.07953 8.66667 7ZM6 17H14.6667C16.0668 17 16.7669 17 17.3016 16.7275C17.772 16.4878 18.1545 16.1054 18.3942 15.635C18.6667 15.1002 18.6667 14.4001 18.6667 13V6C18.6667 4.59987 18.6667 3.8998 18.3942 3.36502C18.1545 2.89462 17.772 2.51217 17.3016 2.27248C16.7669 2 16.0668 2 14.6667 2H6C4.59987 2 3.8998 2 3.36502 2.27248C2.89462 2.51217 2.51217 2.89462 2.27248 3.36502C2 3.8998 2 4.59987 2 6V13C2 14.4001 2 15.1002 2.27248 15.635C2.51217 16.1054 2.89462 16.4878 3.36502 16.7275C3.8998 17 4.59987 17 6 17Z"
                      stroke="black"
                      strokeOpacity="0.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                </svg>
              )}
            </div>
            {it}
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-y-scroll scrollbar-hide px-3">
        <div className="flex mt-3 gap-2 items-center text-black text-body-lg font-medium tracking-wider justify-between mb-2">
          Select Media
          <div>
            <svg
              width="36"
              height="36"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <mask
                id="mask0_7199_123714"
                maskUnits="userSpaceOnUse"
                x="8"
                y="8"
                width="20"
                height="20">
                <rect x="8" y="8" width="20" height="20" fill="#D9D9D9" />
              </mask>
              <g mask="url(#mask0_7199_123714)">
                <path
                  d="M10 14.7515C10 13.508 11.008 12.5 12.2515 12.5C12.8976 12.5 13.4711 12.0866 13.6754 11.4737L13.75 11.25C13.7852 11.1445 13.8027 11.0918 13.8215 11.045C14.0617 10.4476 14.6245 10.042 15.2672 10.003C15.3175 10 15.3731 10 15.4843 10H21.1824C21.2936 10 21.3492 10 21.3995 10.003C22.0422 10.042 22.605 10.4476 22.8451 11.045C22.8639 11.0918 22.8815 11.1445 22.9167 11.25L22.9912 11.4737C23.1955 12.0866 23.7691 12.5 24.4152 12.5C25.6586 12.5 26.6667 13.508 26.6667 14.7515V21.8333C26.6667 23.2335 26.6667 23.9335 26.3942 24.4683C26.1545 24.9387 25.772 25.3212 25.3016 25.5608C24.7669 25.8333 24.0668 25.8333 22.6667 25.8333H14C12.5999 25.8333 11.8998 25.8333 11.365 25.5608C10.8946 25.3212 10.5122 24.9387 10.2725 24.4683C10 23.9335 10 23.2335 10 21.8333V14.7515Z"
                  stroke="white"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 14.7515C10 13.508 11.008 12.5 12.2515 12.5C12.8976 12.5 13.4711 12.0866 13.6754 11.4737L13.75 11.25C13.7852 11.1445 13.8027 11.0918 13.8215 11.045C14.0617 10.4476 14.6245 10.042 15.2672 10.003C15.3175 10 15.3731 10 15.4843 10H21.1824C21.2936 10 21.3492 10 21.3995 10.003C22.0422 10.042 22.605 10.4476 22.8451 11.045C22.8639 11.0918 22.8815 11.1445 22.9167 11.25L22.9912 11.4737C23.1955 12.0866 23.7691 12.5 24.4152 12.5C25.6586 12.5 26.6667 13.508 26.6667 14.7515V21.8333C26.6667 23.2335 26.6667 23.9335 26.3942 24.4683C26.1545 24.9387 25.772 25.3212 25.3016 25.5608C24.7669 25.8333 24.0668 25.8333 22.6667 25.8333H14C12.5999 25.8333 11.8998 25.8333 11.365 25.5608C10.8946 25.3212 10.5122 24.9387 10.2725 24.4683C10 23.9335 10 23.2335 10 21.8333V14.7515Z"
                  stroke="black"
                  strokeOpacity="0.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M18.3333 22.0833C20.4044 22.0833 22.0833 20.4044 22.0833 18.3333C22.0833 16.2623 20.4044 14.5833 18.3333 14.5833C16.2623 14.5833 14.5833 16.2623 14.5833 18.3333C14.5833 20.4044 16.2623 22.0833 18.3333 22.0833Z"
                  stroke="white"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M18.3333 22.0833C20.4044 22.0833 22.0833 20.4044 22.0833 18.3333C22.0833 16.2623 20.4044 14.5833 18.3333 14.5833C16.2623 14.5833 14.5833 16.2623 14.5833 18.3333C14.5833 20.4044 16.2623 22.0833 18.3333 22.0833Z"
                  stroke="black"
                  strokeOpacity="0.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </svg>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
            20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
          ].map((it) => (
            <div
              key={it}
              className="rounded-2xl overflow-hidden relative w-[118px] h-[212px]">
              <div className="absolute top-2 left-2">
                {liked ? (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <mask
                      id="mask0_9897_93314"
                      // style="mask-type:alpha"
                      maskUnits="userSpaceOnUse"
                      x="0"
                      y="0"
                      width="20"
                      height="20">
                      <rect width="20" height="20" fill="#D9D9D9" />
                    </mask>
                    <g mask="url(#mask0_9897_93314)">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M18.3346 9.9974C18.3346 14.5998 14.6037 18.3307 10.0013 18.3307C5.39893 18.3307 1.66797 14.5998 1.66797 9.9974C1.66797 5.39502 5.39893 1.66406 10.0013 1.66406C14.6037 1.66406 18.3346 5.39502 18.3346 9.9974ZM13.9712 7.86918C14.1665 7.67392 14.1665 7.35733 13.9712 7.16207C13.776 6.96681 13.4594 6.96681 13.2641 7.16207L8.6437 11.7825L6.73637 9.87514C6.5411 9.67988 6.22452 9.67988 6.02926 9.87514C5.834 10.0704 5.834 10.387 6.02926 10.5822L8.29015 12.8431C8.48541 13.0384 8.80199 13.0384 8.99726 12.8431L13.9712 7.86918Z"
                        fill="white"
                      />
                    </g>
                  </svg>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <mask
                      id="mask0_9897_85533"
                      maskUnits="userSpaceOnUse"
                      x="0"
                      y="0"
                      width="20"
                      height="20">
                      <rect width="20" height="20" fill="#D9D9D9" />
                    </mask>
                    <g mask="url(#mask0_9897_85533)">
                      <path
                        d="M9.99935 18.3337C14.6017 18.3337 18.3327 14.6027 18.3327 10.0003C18.3327 5.39795 14.6017 1.66699 9.99935 1.66699C5.39698 1.66699 1.66602 5.39795 1.66602 10.0003C1.66602 14.6027 5.39698 18.3337 9.99935 18.3337Z"
                        stroke="white"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  </svg>
                )}
              </div>
              <img
                src={"/test.jpg"}
                alt={"ll"}
                width={118}
                height={212}
                className="rounded-2xl flex-1 h-[212px] object-cover"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between bg-surface pt-2 px-3 pb-4">
        <div className="w-full flex flex-row justify-between items-center gap-3">
          <button type="button"
            onClick={() => setNext(2)}
            className="text-left flex-1 h-10 rounded-full bg-brand text-brandInk text-base font-medium justify-center items-center flex">
            Next
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div className="h-full relative w-full max-w-[450px] bg-surface  flex flex-col">
      <button type="button"
        onClick={() => router.back()}
        className="text-left flex mt-3 gap-2 items-center text-black text-body-lg font-medium tracking-wider">
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <mask
            id="mask0_9897_85754"
            style={{ maskType: "alpha" }}
            maskUnits="userSpaceOnUse"
            x="8"
            y="8"
            width="20"
            height="20">
            <rect x="8" y="8" width="20" height="20" fill="#D9D9D9" />
          </mask>
          <g mask="url(#mask0_9897_85754)">
            <path
              d="M23.832 18.0003H12.1654M12.1654 18.0003L17.9987 12.167M12.1654 18.0003L17.9987 23.8337"
              stroke="white"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M23.832 18.0003H12.1654M12.1654 18.0003L17.9987 12.167M12.1654 18.0003L17.9987 23.8337"
              stroke="black"
              strokeOpacity="0.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
        Share a spotlight
      </button>
      <div className="flex-1 overflow-y-scroll scrollbar-hide px-3 pt-4">
        <div className="flex justify-between flex-col gap-4 p-3 border rounded-xl">
          <button type="button"
            onClick={() => setShow(!show)}
            className="text-left flex justify-between items-center gap-3">
            <div>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <mask
                  id="mask0_9897_86840"
                  style={{ maskType: "alpha" }}
                  maskUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width="20"
                  height="20">
                  <rect width="20" height="20" fill="#D9D9D9" />
                </mask>
                <g mask="url(#mask0_9897_86840)">
                  <path
                    d="M17.0833 6.05941L9.99997 9.99459M9.99997 9.99459L2.91664 6.05941M9.99997 9.99459L10 17.9113M17.5 13.3767V6.61249C17.5 6.32695 17.5 6.18419 17.4579 6.05685C17.4207 5.94421 17.3599 5.8408 17.2795 5.75356C17.1886 5.65495 17.0638 5.58561 16.8142 5.44695L10.6475 2.02102C10.4112 1.88972 10.293 1.82407 10.1679 1.79833C10.0571 1.77556 9.94288 1.77556 9.83213 1.79833C9.70698 1.82407 9.58881 1.88972 9.35248 2.02102L3.18581 5.44695C2.93621 5.58562 2.8114 5.65495 2.72053 5.75356C2.64013 5.84081 2.57929 5.94421 2.54207 6.05685C2.5 6.18419 2.5 6.32695 2.5 6.61249V13.3767C2.5 13.6623 2.5 13.8051 2.54207 13.9324C2.57929 14.045 2.64013 14.1484 2.72053 14.2357C2.8114 14.3343 2.93621 14.4036 3.18581 14.5423L9.35248 17.9682C9.58881 18.0995 9.70698 18.1652 9.83213 18.1909C9.94288 18.2137 10.0571 18.2137 10.1679 18.1909C10.293 18.1652 10.4112 18.0995 10.6475 17.9682L16.8142 14.5423C17.0638 14.4036 17.1886 14.3343 17.2795 14.2357C17.3599 14.1484 17.4207 14.045 17.4579 13.9324C17.5 13.8051 17.5 13.6623 17.5 13.3767Z"
                    stroke="black"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              </svg>
            </div>
            <div className="flex-1 text-black text-body font-medium">
              Link spotlights to a product
            </div>
            <div>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <mask
                  id="mask0_9897_51122"
                  style={{ maskType: "alpha" }}
                  maskUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width="20"
                  height="20">
                  <rect width="20" height="20" fill="#D9D9D9" />
                </mask>
                <g mask="url(#mask0_9897_51122)">
                  <path
                    d="M7.5 15L12.5 10L7.5 5"
                    stroke="black"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              </svg>
            </div>
          </button>
          <div className="flex gap-2 justify-between items-center p-2 rounded-xl border bg-surface-subtle">
            <div className="w-16 h-16 overflow-hidden rounded-xl">
              <img
                src="/test.jpg"
                alt="fds"
                className="w-16 h-16 rounded-xl object-cover"
              />
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex gap-1 justify-between items-center">
                <p className="line-clamp-1 text-body-sm text-black tracking-wider font-normal leading-4 flex-1">
                  Gucci bag – the epitome of luxury and sophistic...
                </p>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <mask
                    id="mask0_7655_349306"
                    maskUnits="userSpaceOnUse"
                    x="0"
                    y="0"
                    width="20"
                    height="20">
                    <rect width="20" height="20" fill="#D9D9D9" />
                  </mask>
                  <g mask="url(#mask0_7655_349306)">
                    <path
                      d="M15 5L5 15M5 5L15 15"
                      stroke="black"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                </svg>
              </div>
              <div className="flex gap-4 items-center">
                <p className="line-clamp-1 text-body-sm text-foreground-secondary tracking-wider font-normal leading-4">
                  Stock: 50
                </p>
                <p className="line-clamp-1 text-body-sm text-foreground-secondary tracking-wider font-normal leading-4">
                  Variant : 5
                </p>
              </div>
              <div>
                <p className="line-clamp-1 text-body-sm text-black tracking-wider font-normal leading-4 flex-1">
                  ₦18.0
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex rounded-xl gap-2 w-full pt-4">
          <div className="w-[100px] h-[180px] overflow-hidden">
            <img
              src={"/test.jpg"}
              alt={"ll"}
              className="rounded-xl flex-1 w-[100px] h-[180px] object-cover"
            />
          </div>
          <div className="border rounded-xl flex-1">
            <div className="text-body-lg font-medium text-black leading-5 tracking-wider p-2 border-b ">
              Add Hashtags
            </div>
            <div className="h-full w-full p-2">
              <input type="text" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between bg-surface pt-3 px-3 pb-4 border-t">
        <div className="w-full flex flex-row justify-between items-center gap-3">
          <Link href={"/setup"} className="flex-1 h-10 rounded-full border-brandDeep border bg-surface text-brandDeep text-base font-medium justify-center items-center flex">
            Save Draft
          </Link>
          <Link href={"/setup"} className="flex-1 h-10 rounded-full bg-brand text-brandInk text-base font-medium justify-center items-center flex">
            Post Spotlight
          </Link>
        </div>
      </div>
      {show && <Modall action={() => setShow(!show)} router={router} />}
    </div>
  );
}
