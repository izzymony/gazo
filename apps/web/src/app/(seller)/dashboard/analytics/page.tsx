"use client";
import React, { useState } from "react";
import Dropdown from "@/features/seller-shell/Dropdown";
import Sales from "@/features/seller-dashboard/sales";
import Customer from "@/features/seller-dashboard/customers";
// import Engagement from "@/features/seller-dashboard/engagement";
import PageShell from "@/design-system/PageShell";
import Header from "@/design-system/common/Header";
import Tabs from "@/design-system/common/Tabs";

const Page = () => {
  const [sortOrder, setSortOrder] = useState("Today");

  const tabs = ["Sales", "Customers"];
  const tabContents = [
    <Sales key={0} />,
    <Customer key={1} />
  ];

  const handleSortChange = (option: string) => {
    setSortOrder(option);
  };

  return (
    <PageShell
      header={
        <Header
          showMenu
          customText="Analytics"
        />
      }>
        <Tabs
          tabs={tabs}
          tabContents={tabContents}
          generalContent={
            <div className="flex justify-between items-center">
              <Dropdown
                options={["Today", "Tomorrow"]}
                onSelect={handleSortChange}
                selectedOption={sortOrder}
                placeholder="filter"
              />
              <div className="flex items-center">
                <p className="text-body-sm text-ink-60">Tue, June 5</p>
              </div>
            </div>
          }
        />
    </PageShell>
  );
};

export default Page;
