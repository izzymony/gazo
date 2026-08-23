/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import FluidCard, {
  Liked,
  SavedIcon,
  ShareIcon,
  Unliked,
} from "@/features/shop/fluidcard";
import { BiArrowBack, Plus } from "@/design-system/icons";

export default function Page() {
  const pathName = usePathname();
  const [liked, setLiked] = useState(false);

  return (
    <div className="h-screen relative w-screen max-w-[450px] bg-white  flex flex-col">
      <div className="flex-1 overflow-y-scroll scrollbar-hide">
        <div className="h-screen relative w-screen max-w-[450px] bg-white">
          <div className="flex-1 flex flex-col absolute top-0 bottom-0 left-0 right-0 justify-between pb-20 px-3">
            <div className="w-full gap-3 flex flex-col h-full relative">
              <div className="absolute left-0 top-0 w-9 h-9 flex items-center justify-center">
                <BiArrowBack size={24} className="text-white" />
              </div>
              <div className="w-full h-full flex flex-col justify-between items-center gap-1">
                <div className="flex-1 justify-end flex items-center w-full">
                  <div className="flex flex-col gap-2">
                    {liked ? <Liked /> : <Unliked />}
                    {liked ? <Liked /> : <SavedIcon />}
                    {liked ? <Liked /> : <ShareIcon />}
                  </div>
                </div>
                <div className="w-full flex-col justify-end gap-3 flex">
                  <div className="flex gap-2 overflow-x-scroll scrollbar-hide items-center flex-nowrap flex-row">
                    <div className="overflow-hidden">
                      <img
                        src="/test.jpg"
                        alt="test"
                        className="w-10 rounded-field object-cover h-12"
                      />
                    </div>
                    <div className="w-10 h-12 rounded-field bg-white/20 flex items-center justify-center">
                      <Plus size={20} className="text-white" />
                    </div>
                  </div>
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
      </div>
      <div className="flex items-center justify-between bg-black pt-3 pb-6 px-3">
        <div className="flex-1 h-10 rounded-full bg-brand text-white text-body-lg font-medium justify-center items-center flex">
          Next
        </div>
      </div>
    </div>
  );
}
