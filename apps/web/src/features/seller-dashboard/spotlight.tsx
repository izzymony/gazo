/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import DataSort from "./datasort";
import { formatCurrency, formatDate, getMobileCompatibleImageUrl } from "@/lib/utils";
import useProductStore from "@/store/productStore";
import EmptyState from "@vibaar/ui/common/EmptyState";
import { useRouter } from "next/navigation";
import useBusinessStore, { BusinessProduct } from "@/store/businessStore";
import useAuthStore from "@/store/authStore";

interface StatusBadgeProps {
  status: number;
}

const statusMapping = {
  0: {
    text: "active",
    bgColor: "#EAFFF6",
    textColor: "#6CFFBF",
    borderColor: "#6CFFBF",
  },
  1: {
    text: "Draft",
    bgColor: "#00000008",
    textColor: "#0000004D",
    borderColor: "#0000004D",
  },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusData = statusMapping[status as keyof typeof statusMapping];
  return (
    <div
      className="text-caption px-2 rounded-3xl border-[1px] border-solid"
      style={{
        backgroundColor: statusData.bgColor,
        color: statusData.textColor,
        borderColor: statusData.borderColor,
      }}>
      {statusData.text}
    </div>
  );
};

interface ProductProps {
  product: BusinessProduct;
}

const ProductComp: React.FC<ProductProps> = ({ product }: ProductProps) => {
  const router = useRouter();
  const { store } = useBusinessStore();

  return (
    <div
      className="space-y-4 cursor-pointer"
      onClick={() =>
        router.push(`/dashboard/catalog/product/${product?.id}`)
      }>
      <div className="flex justify-between gap-2">
        <img
          src={product.image ? getMobileCompatibleImageUrl(product.image[0]) : ""}
          alt="Product"
          className="object-fit h-[60px] w-[60px]"
        />
        <div className="w-[100%]">
          <div className="flex space-x-8 justify-between">
            <span className="text-sm font-medium line-clamp-2">
              {product?.title} - {product?.description}
            </span>
            <p className="text-sm font-medium text-ink-90 ml-auto">
              {formatCurrency(product?.price ? +product.price : 0)}
            </p>
          </div>
          <div className="flex gap-4">
            <p className="text-xs text-ink-90">Stock: {product?.stock}</p>
            <span className="text-xs space-x-1 flex items-center rounded-xl text-ink-90">
              {product?.tag.length && (
                <span>Variant: {product?.tag.length}</span>
              )}
            </span>
          </div>
          <div className="flex justify-between w-full mt-1">
            <div className="text-caption text-ink-40 text-xs">
              Last modified:{" "}
              {formatDate(new Date(product?.created_at || Date.now()))}
            </div>
            <StatusBadge status={product?.status === "active" ? 0 : 1} />
          </div>
          {product?.category?.name && (
            <span className=" text-xs px-3 py-1 rounded-lg bg-[#ededf0]">
              {product?.category?.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Spotlights() {
  const { products } = useProductStore();
  const { businessProduct } = useBusinessStore();
  const { user } = useAuthStore();
  const [sortProduct, setSortProduct] = useState<"ascending" | "descending">(
    "ascending"
  );

  //("products pay ", products, user?.business?.id, user);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSortToggle = () => {
    setSortProduct((prevproduct) =>
      prevproduct === "ascending" ? "descending" : "ascending"
    );
  };

  const handleSortChange = (option: "ascending" | "descending") => {
    setSortProduct(option);
  };

  const filteredProducts = businessProduct
    ?.filter(
      (product) =>
        product.title &&
        product.title.toLowerCase().includes(searchTerm?.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return sortProduct === "ascending" ? dateA - dateB : dateB - dateA;
    });

  //("filtered ", filteredProducts, businessProduct, products);

  return (
    <>
      <div className="flex justify-between items-center px-4">
        <DataSort
          sortOrder={sortProduct}
          onSortToggle={handleSortToggle}
          onSortOrderChange={handleSortChange}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
        />
      </div>
      <div className="w-full ps-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
            20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
          ].map((it) => (
            <div
              key={it}
              className="rounded-2xl overflow-hidden relative w-[118px] h-[212px]">
              <div className="absolute bottom-2 left-2 text-white text-body font-medium flex items-center">
                <div>
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 19 19"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <mask
                      id="mask0_9897_85298"
                      maskUnits="userSpaceOnUse"
                      x="0"
                      y="0"
                      width="19"
                      height="19">
                      <rect
                        x="0.339844"
                        y="0.50293"
                        width="18.4578"
                        height="18.4578"
                        fill="#D9D9D9"
                      />
                    </mask>
                    <g mask="url(#mask0_9897_85298)">
                      <path
                        d="M4.03125 3.97935C4.03125 3.23246 4.03125 2.85901 4.18698 2.65315C4.32265 2.47381 4.53001 2.36283 4.75449 2.34943C5.01215 2.33405 5.32288 2.5412 5.94434 2.9555L14.0316 8.34699C14.5451 8.68933 14.8018 8.86049 14.8913 9.07624C14.9695 9.26486 14.9695 9.47684 14.8913 9.66546C14.8018 9.8812 14.5451 10.0524 14.0316 10.3947L5.94434 15.7862C5.32288 16.2005 5.01215 16.4076 4.75449 16.3923C4.53001 16.3789 4.32265 16.2679 4.18698 16.0885C4.03125 15.8827 4.03125 15.5092 4.03125 14.7623V3.97935Z"
                        stroke="white"
                        stroke-width="0.922888"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </g>
                  </svg>
                </div>
                254
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
      {/* <div className="space-y-6 px-4">
        {[1].length > 0 ? (
          filteredProducts
            .reverse()
            ?.map((product, index) => (
              <ProductComp key={index} product={product} />
            ))
        ) : (
          <EmptyState
            image="/images/emptystate/products_empty_state.svg"
            title="No products yet."
            subtitle="Start by adding a product to your store."
          />
        )}
      </div> */}
    </>
  );
}
