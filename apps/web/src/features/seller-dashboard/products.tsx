/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import DataSort from "./datasort";
import { formatCurrency, formatDate, getMobileCompatibleImageUrl } from "@/lib/utils";
import useProductStore from "@/store/productStore";
import EmptyState from "@vibaar/ui/common/EmptyState";
import Section from "@vibaar/ui/common/Section";
import { useRouter } from "next/navigation";
import useBusinessStore, { BusinessProduct } from "@/store/businessStore";
import useAuthStore from "@/store/authStore";
import StatusBadge from "@/features/orders/StatusBadge";

interface ProductProps {
  product: BusinessProduct;
}

const ProductComp: React.FC<ProductProps> = ({ product }: ProductProps) => {
  const router = useRouter();
  const { store } = useBusinessStore();

  return (
    <div
      className="cursor-pointer"
      onClick={() =>
        router.push(`/dashboard/catalog/product/${product?.id}`)
      }>
      <div className="flex justify-between gap-2">
        <img
          src={product.image ? getMobileCompatibleImageUrl(product.image[0]) : ""}
          alt="Product"
          className="object-cover h-[60px] w-[60px] min-w-[60px] min-h-[60px] max-w-[60px] max-h-[60px] rounded-field flex-shrink-0"
        />
        <div className="w-[100%]">
          <div className="flex space-x-8 justify-between">
            <span className="text-body font-medium line-clamp-2">
              {product?.title} - {product?.description}
            </span>
            <p className="text-body font-medium text-foreground-primary ml-auto">
              {formatCurrency(product?.price ? +product.price : 0)}
            </p>
          </div>
          <div className="flex gap-4">
            <p className="text-body-sm text-foreground-primary">Stock: {product?.stock}</p>
            <span className="text-body-sm space-x-1 flex items-center rounded-field text-foreground-primary">
              {product?.tag && product?.tag.length > 0 && (
                <span>Variant: {product?.tag.length}</span>
              )}
            </span>
          </div>
          <div className="flex justify-between w-full mt-1">
            <div className="text-caption text-foreground-muted">
              Last modified:{" "}
              {formatDate(new Date(product?.created_at || Date.now()))}
            </div>
            <StatusBadge status={product?.status === "active" ? "active" : "Draft"} />
          </div>
          {product?.category?.name && (
            <span className=" text-body-sm px-3 py-1 rounded-field bg-surface-muted">
              {product?.category?.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const Product = () => {
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
    <div className="space-y-6">
      <DataSort
        sortOrder={sortProduct}
        onSortToggle={handleSortToggle}
        onSortOrderChange={handleSortChange}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
      />
      <Section>
        {businessProduct.length > 0 ? (
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
      </Section>
    </div>
  );
};

export default Product;
