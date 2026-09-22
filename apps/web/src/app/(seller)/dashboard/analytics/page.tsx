"use client";
import React, { useState } from "react";
import Sales from "@/features/seller-dashboard/sales";
import Customer from "@/features/seller-dashboard/customers";
// import Engagement from "@/features/seller-dashboard/engagement";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import Tabs from "@vibaar/ui/common/Tabs";
import FilterBar from "@vibaar/ui/common/FilterBar";
import DropdownSelect from "@vibaar/ui/common/DropdownSelect";

const Page = () => {
  const [period, setPeriod] = useState("Today");

  const tabs = ["Sales", "Customers"];
  const tabContents = [<Sales key={0} />, <Customer key={1} />];

  return (
    <PageShell
      header={<Header title="Analytics" />}>
      <Tabs
        tabs={tabs}
        tabContents={tabContents}
        // The same row primitive the catalog and the storefront use, in the
        // same slot. It was a bare inline flex div here, so the gap between the
        // tab bar and the controls under it was different on every screen that
        // has this pattern.
        generalContent={
          <FilterBar
            sticky={false}
            showSearch={false}
            showSort={false}
            ariaLabel="Analytics period"
            leading={
              <DropdownSelect
                options={["Today", "This week", "This month"]}
                value={period}
                onSelect={setPeriod}
                ariaLabel="Reporting period"
              />
            }
            trailing={
              <p className="text-body-sm text-foreground-secondary">
                {new Date().toLocaleDateString(undefined, {
                  weekday: "short",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            }
          />
        }
      />
    </PageShell>
  );
};

export default Page;
