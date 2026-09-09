/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import FloatingHeader from "./floatingheader";
import FluidCard, {
  CartIcon,
  Liked,
  SavedIcon,
  ShareIcon,
  Unliked,
} from "../fluidcard";
import Navicard from "../navigacard";
import { navLinks } from "../spotlightNav";
import { usePathname } from "next/navigation";

export default function Spotlights({
  show,
  setShow,
}: {
  show: string;
  setShow: (val: string) => void;
}) {
  const pathName = usePathname();
  const [liked, setLiked] = useState(false);

  return (
    <div className="h-[100dvh] relative w-screen max-w-[1050px] bg-surface flex flex-col">
      <div className="flex-1 overflow-y-scroll scrollbar-hide">
        {[1, 2, 3, 4, 5].map((it) => (
          <div
            key={it}
            className="overflow-y-scroll scrollbar-hide h-[100dvh] relative w-screen max-w-[1050px] bg-surface">
            <div className="flex-1 flex flex-col absolute top-0 bottom-0 left-0 right-0 justify-between pb-[calc(5rem+env(safe-area-inset-bottom))] px-5">
              <div>
                <FloatingHeader show={show} setShow={setShow} />
              </div>
              <div className="w-full gap-3 flex flex-col">
                <div className="w-full flex flex-row justify-between items-center gap-1">
                  <div className="w-5/6 flex-col justify-end gap-3 flex">
                    <div className="flex gap-2 w-full items-center">
                      <img
                        src="/PRODUCT IMAGE (2).PNG"
                        alt="img"
                        className="rounded-full object-cover w-[24px] h-[24px]"
                      />
                      <p className="font-medium text-body-sm leading-[14px] text-white">
                        Gucci Store
                      </p>
                      <div className="flex-1 justify-start flex">
                        <div className="px-4 h-7 justify-center items-center flex border border-white rounded-full text-sm text-center text-white">
                          <p>Follow</p>
                        </div>
                      </div>
                    </div>
                    <p className="font-normal text-caption leading-[14px] text-white line-clamp-1">
                      Step out in style with our iconic Gucci bag – the epitome
                      of luxury and sophistication. Crafted with precision and
                      adorned with the signature Gucci logo, this timeless
                      accessory effortlessly elevates any outfit. Make a
                      statement wherever you go. #Gucci #LuxuryFashion
                      #IconicStyle
                    </p>
                    <div className="flex gap-2 overflow-x-scroll scrollbar-hide items-center flex-nowrap flex-row">
                      <FluidCard
                        text={"✅ Quality assured"}
                        backgroundcolor="#FFFFFF33"
                      />
                      <FluidCard
                        text={"🏆 Buyers choice"}
                        backgroundcolor="#FFFFFF33"
                      />
                      <FluidCard
                        text={"👑 Top selling vendors"}
                        backgroundcolor="#FFFFFF33"
                      />
                      <FluidCard
                        text={"✅ Quality assured"}
                        backgroundcolor="#FFFFFF33"
                      />
                      <FluidCard
                        text={"🏆 Buyers choice"}
                        backgroundcolor="#FFFFFF33"
                      />
                      <FluidCard
                        text={"👑 Top selling vendors"}
                        backgroundcolor="#FFFFFF33"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {liked ? <Liked /> : <Unliked />}
                    {liked ? <Liked /> : <SavedIcon />}
                    {liked ? <Liked /> : <ShareIcon />}
                  </div>
                </div>
                <div className="w-full flex flex-row justify-between items-center gap-3">
                  <div className="flex-1 h-10 rounded-full bg-brand text-brandInk text-base font-medium justify-center items-center flex">
                    Buy now
                  </div>
                  <div>
                    <CartIcon />
                  </div>
                </div>
              </div>
            </div>
            <img
              src="/PRODUCT IMAGE (2).PNG"
              alt="img"
              className="object-cover w-[100%] h-[100%]"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between bg-black pt-2 pb-[env(safe-area-inset-bottom,0.5rem)]">
        {navLinks.map((it) => (
          <Navicard
            key={it.route}
            icon={pathName === it.route ? it.icon.active : it.icon.inactive}
            tab={it.tab}
            route={it.route}
            active={pathName === it.route}
          />
        ))}
      </div>
    </div>
  );
}
