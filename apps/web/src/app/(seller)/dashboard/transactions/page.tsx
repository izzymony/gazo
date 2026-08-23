/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import PageShell from "@vibaar/ui/PageShell";
import Header from "@/design-system/common/Header";
import Section from "@/design-system/common/Section";
import EmptyState from "@/design-system/common/EmptyState";
import FilterBar from "@/design-system/common/FilterBar";
import { TransactionCard } from "@/design-system/selecticons";
import useBusinessStore from "@/store/businessStore";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Page() {
  const router = useRouter();
  const [selected, setSelected] = useState("All");
  const { walletTransactions } = useBusinessStore();

  const transactions = walletTransactions.map((item) => ({
    type:
      item.balance_before > item.balance_after ? "debit" : ("credit" as any),
    amount: item.amount,
    icon: "order" as any,
    title: item.type_description,
    time: "Yesterday",
  }));

  return (
    <PageShell
      header={
        <Header
          showBack
          onBackClick={() => router.back()}
          customText="Transaction history"
        />
      }>
      {transactions.length > 0 ? (
        <>
          <FilterBar
            pills={["All", "Inflow", "Outflow"]}
            activePill={["All", "Inflow", "Outflow"].indexOf(selected)}
            onPillChange={(index) =>
              setSelected(["All", "Inflow", "Outflow"][index])
            }
          />
          <Section>
            <div className="flex flex-col">
            {transactions
              .filter((its) => {
                if (selected === "All") {
                  return its;
                } else {
                  if (selected == "Inflow") {
                    return its.type === "credit";
                  } else {
                    return its.type !== "credit";
                  }
                }
              })
              .map((it, i) => (
                <TransactionCard
                  key={i}
                  type={it.type}
                  amount={it.amount + ""}
                  icon={it.icon}
                  title={it.title}
                  time={it.time}
                />
              ))}
            </div>
          </Section>
        </>
      ) : (
        <EmptyState
          image="/images/emptystate/activity_empty_state.svg"
          title="No recent activities yet."
          subtitle="Any activities on your store will appear here."
        />
      )}
    </PageShell>
  );
}
