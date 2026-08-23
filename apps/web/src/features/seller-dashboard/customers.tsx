/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import StatsCard from "./statcard";
import EmptyState from "@vibaar/ui/common/EmptyState";
import Section from "@vibaar/ui/common/Section";
import useBusinessStore from "@/store/businessStore";
import CustomerComp from "@/features/seller-dashboard/CustomerComp";

const Customers = () => {
  const { customer, customerranking } = useBusinessStore();
  const statsData = [
    {
      label: "New customers",
      count: customer.summary.new_customers,
      percentage: `${customer.percent_change.new_customers}%`,
    },
    {
      label: "Returning customers",
      count: customer.summary.returning_customers,
      percentage: `${customer.percent_change.returning_customers}%`,
    },
    {
      label: "Active customers",
      count: customer.summary.active_customers,
      percentage: `${customer.percent_change.active_customers}%`,
    },
    {
      label: "Innactive",
      count: customer.summary.inactive_customers,
      percentage: `${customer.percent_change.inactive_customers}%`,
    },
    {
      label: "Average customer value",
      count: customer.summary.average_customer_value,
      percentage: `${customer.percent_change.average_customer_value}%`,
    },
  ];
  return (
    <div className="space-y-6">
      <StatsCard data={statsData} />
      <Section title="Customer ranking">
        {customerranking.length > 0 ? (
          customerranking.map((customer, index) => (
            <CustomerComp key={index} customer={customer} />
          ))
        ) : (
          <EmptyState
            image="/images/emptystate/discount_empty_state.svg"
            title="No customer rankings yet."
            subtitle="Once customers become repeat buyers they will appear here based on ranks."
          />
        )}
      </Section>
    </div>
  );
};

export default Customers;
