/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import StatsCard from "./statcard";
import EmptyState from "@vibaar/ui/common/EmptyState";
import Section from "@vibaar/ui/common/Section";
import useBusinessStore, { ProductRanking } from "@/store/businessStore";
import { formatNigerianCurrency } from "@/lib/utils";

const SalesComp: React.FC<{ sale: ProductRanking }> = ({ sale }) => {
  return (
    <div className="">
      <div className="flex items-start gap-2">
        <img src={sale.image[0]} alt="product" className="w-10 h-10 rounded-field object-cover" />
        <div className="w-full">
          <div className="flex items-center w-full">
            <p className="text-body-sm font-medium text-ink-90">{sale.title}</p>
            <p className="ml-auto text-body font-medium text-ink-90">₦{formatNigerianCurrency(sale.total_sales || 0)}</p>
          </div>
          <div className=" text-ink-40 font-medium text-caption space-x-3 flex items-center ">
            <div>
              Views: <span className="font-medium text-ink-90">{formatNigerianCurrency(sale.total_views)}</span>
            </div>
            <div>
              Orders: <span className="font-medium text-ink-90">{formatNigerianCurrency(sale.total_orders)}</span>
            </div>
            <div>
              Sales: <span className="font-medium text-ink-90">{formatNigerianCurrency(sale.total_sales)}</span>
            </div>
            <div>
              Stock: <span className="font-medium text-ink-90">{formatNigerianCurrency(sale.stock)}</span>
            </div>
          </div>{" "}
        </div>
      </div>
    </div>
  );
};

const Product = () => {
  const { productrakings, sales } = useBusinessStore();
  const statsData = [
    {
      label: "Store visitors",
      count: sales.summary.store_visitors,
      percentage: `${sales.percent_change.store_visitors}%`,
    },
    {
      label: "Orders",
      count: sales.summary.total_orders,
      percentage: `${sales.percent_change.total_orders}%`,
    },
    {
      label: "Sales",
      count: sales.summary.total_sales,
      percentage: `${sales.percent_change.total_sales}%`,
    },
    {
      label: "Active orders",
      count: sales.summary.active_orders,
      percentage: `${sales.percent_change.active_orders}%`,
    },
    {
      label: "Cancelled orders",
      count: sales.summary.cancelled_orders,
      percentage: `${sales.percent_change.cancelled_orders}%`,
    },
    {
      label: "Average order value",
      count: sales.summary.average_order_value,
      percentage: `${sales.percent_change.average_order_value}%`,
    },
  ];
  return (
    <div className="space-y-6">
      <StatsCard data={statsData} />
      <Section title={`Products ranking (${productrakings.length})`}>
        {productrakings.length > 0 ? (
          productrakings.map((sale, index) => (
            <SalesComp key={index} sale={sale} />
          ))
        ) : (
          <EmptyState
            image="/images/emptystate/sales_empty_state.svg"
            title="No product rankings yet."
            subtitle="Once your products starts getting views, orders and sales, they will appear here."
          />
        )}
      </Section>
    </div>
  );
};

export default Product;
