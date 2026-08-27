/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { IoCubeOutline } from "@vibaar/ui/icons";
import DataSort from "./datasort";
import EmptyState from "@vibaar/ui/common/EmptyState";
import Section from "@vibaar/ui/common/Section";
import useBusinessStore from "@/store/businessStore";
import { paginatedFetcher } from "@/app/(auth)/welcome/pagination";

const Discount: React.FC<{ order: any }> = ({ order }) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center ">
        <div className="">
          <div className="flex items-center space-x-8">
            <span className="text-body font-medium text-ink-90">
              {order.title}
            </span>
            <span className="text-body-sm space-x-1 flex items-center rounded-field bg-ink-3">
              <span>{order.products.length}</span>
              <IoCubeOutline />
            </span>
          </div>
        </div>
        <div>
          <span className="text-body-sm font-medium text-ink-90 py-1 px-2 rounded-field bg-ink-5">
            {order.type}
          </span>
        </div>
      </div>
      <div className="flex justify-between ">
        <p className="text-body-sm text-ink-40">{order.discount_type}</p>
        <span className="text-caption text-ink-40">{`${order.valid_from
          .toString()
          .slice(0, 10)} - ${order.valid_to.toString().slice(0, 10)}`}</span>
      </div>
    </div>
  );
};

const Page = () => {
  const [sortOrder, setSortOrder] = useState<"ascending" | "descending">(
    "ascending"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const { discounts, fetchDiscount, setDiscount } = useBusinessStore();

  // P12: discounts load HERE (their only render site) instead of on the dashboard
  // home, which fetched them on every visit but never showed them. paginatedFetcher
  // early-stops, so a seller with a few discounts costs 1-2 requests, not a fixed 10.
  useEffect(() => {
    paginatedFetcher(fetchDiscount, setDiscount, null, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSortToggle = () => {
    setSortOrder((prevOrder) =>
      prevOrder === "ascending" ? "descending" : "ascending"
    );
  };

  const handleSortChange = (option: "ascending" | "descending") => {
    setSortOrder(option);
  };

  const filteredOrders = discounts
    // .filter((order) =>
    //   order.dn.toLowerCase().includes(searchTerm.toLowerCase())
    // )
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "ascending" ? dateA - dateB : dateB - dateA;
    });

  return (
    <div className="space-y-6">
      <DataSort
        sortOrder={sortOrder}
        onSortToggle={handleSortToggle}
        onSortOrderChange={handleSortChange}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
      />
      <Section>
        {discounts.length > 0 ? (
          filteredOrders.map((order, index) => (
            <Discount key={index} order={order} />
          ))
        ) : (
          <EmptyState
            image="/images/emptystate/discount_empty_state.svg"
            title="No discounts yet."
            subtitle="Start by creating a discount and then selecting products they apply to."
          />
        )}
      </Section>
    </div>
  );
};

export default Page;
