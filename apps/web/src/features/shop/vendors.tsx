/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Shop from "./shop";
import Spotlights from "./spotlights";

export default function AllVendorsDetails({ data }: { data: any }) {
  const [show, setShow] = useState("Shop");

  return (
    <div className="flex-1 bg-surface justify-center items-center flex-col overflow-y-scroll scrollbar-hide">
      {show === "Shop" ? (
        <Shop show={show} setShow={setShow} />
      ) : (
        <Spotlights show={show} setShow={setShow} />
      )}
    </div>
  );
}
