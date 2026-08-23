/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import StatsCard from "./statcard";
import greenstats from "../../../public/redBag.svg";
import avatar from "../../../public/redBag.svg";
import EmptyState from "@vibaar/ui/common/EmptyState";

interface StatusBadgeProps {
  status: number;
}

interface CustomerData {
  id: number;
  name: string;
  location: string;
  numberOfOrders: number;
  lastPurchase: string;
  totalSpent: number;
  status: number;
}

const customers: CustomerData[] = [
  {
    id: 1,
    name: "Alice Johnson",
    location: "New York, NY",
    numberOfOrders: 5,
    lastPurchase: "2024-10-15",
    totalSpent: 230.5,
    status: 0,
  },
  {
    id: 2,
    name: "Bob Smith",
    location: "Los Angeles, CA",
    numberOfOrders: 3,
    lastPurchase: "2024-10-20",
    totalSpent: 150.75,
    status: 1,
  },
  {
    id: 3,
    name: "Carol Williams",
    location: "Chicago, IL",
    numberOfOrders: 8,
    lastPurchase: "2024-09-30",
    totalSpent: 480.0,
    status: 1,
  },
  {
    id: 4,
    name: "David Brown",
    location: "Houston, TX",
    numberOfOrders: 1,
    lastPurchase: "2024-10-05",
    totalSpent: 25.99,
    status: 1,
  },
  {
    id: 5,
    name: "Eve Davis",
    location: "Phoenix, AZ",
    numberOfOrders: 6,
    lastPurchase: "2024-10-22",
    totalSpent: 310.2,
    status: 1,
  },
  {
    id: 6,
    name: "Frank Miller",
    location: "Philadelphia, PA",
    numberOfOrders: 2,
    lastPurchase: "2024-10-10",
    totalSpent: 89.9,
    status: 1,
  },
  {
    id: 7,
    name: "Grace Lee",
    location: "San Antonio, TX",
    numberOfOrders: 4,
    lastPurchase: "2024-09-25",
    totalSpent: 175.3,
    status: 1,
  },
  {
    id: 8,
    name: "Henry Wilson",
    location: "San Diego, CA",
    numberOfOrders: 7,
    lastPurchase: "2024-10-18",
    totalSpent: 520.45,
    status: 0,
  },
  {
    id: 9,
    name: "Isla Martinez",
    location: "Dallas, TX",
    numberOfOrders: 3,
    lastPurchase: "2024-10-21",
    totalSpent: 210.0,
    status: 1,
  },
  {
    id: 10,
    name: "Jack Taylor",
    location: "San Jose, CA",
    numberOfOrders: 5,
    lastPurchase: "2024-10-12",
    totalSpent: 340.8,
    status: 0,
  },
];

interface StatusBadgeProps {
  status: number;
}

const statusMapping = {
  0: {
    text: "New",
    bgColor: "#e4fcfb",
    textColor: "#02A29E",
    borderColor: "#02A29E",
  },
  1: {
    text: "Returning",
    bgColor: "#0048B3",
    textColor: "#fff",
    borderColor: "#0048B3",
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

const statsData = [
  { label: "Impressions", count: 0, percentage: "10%", imgSrc: greenstats.src },
  { label: "Engagement", count: 0, percentage: "10%", imgSrc: greenstats.src },
  { label: "Clicks", count: 0, percentage: "10%", imgSrc: greenstats.src },
  { label: "Orders", count: 0, percentage: "10%", imgSrc: greenstats.src },
  { label: "Conversion", count: 0, percentage: "10%", imgSrc: greenstats.src },
];

const EngagementComp: React.FC<{ customer: CustomerData }> = ({ customer }) => {
  return (
    <div className="opacity-10">
      <div className="flex items-start justify-between">
        <img src={avatar.src} alt="avatar" className="w-[10%]" />

        <div className="w-[60%]">
          <div className="flex items-center space-x-3">
            <p className="text-body-sm font-medium text-ink-90">
              {customer.name}
            </p>
            <StatusBadge status={customer.status} />
          </div>
          <p className="text-caption text-ink-40">{customer.location}</p>
        </div>
        <div className="w-[20%]">
          <p className="text-body font-medium text-ink-90">
            ₦{customer.totalSpent}
          </p>
          <p className="text-caption text-ink-40">Spent</p>
        </div>
      </div>
      <div className="ml-[15%] text-ink-40 font-medium text-caption space-x-3">
        <span>Orders:{customer.numberOfOrders}</span>
        <span>Last purchase: {customer.lastPurchase}</span>
      </div>
    </div>
  );
};

const Engagement = () => {
  return (
    <div className="">
      <StatsCard data={statsData} />
      <h1 className="mb-2 px-4 ">Spotlight ranking </h1>

      <div className="space-y-6 px-4">
        {customers.length < 1 ? (
          customers.map((customer, index) => (
            <EngagementComp key={index} customer={customer} />
          ))
        ) : (
          <EmptyState
            image="/images/emptystate/sales_empty_state.svg"
            title="No spotlight rankings yet."
            subtitle="Once your products starts getting views, orders and sales, they will appear here."
          />
        )}
      </div>
    </div>
  );
};

export default Engagement;
