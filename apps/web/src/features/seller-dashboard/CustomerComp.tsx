/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import { CustomerRanking } from "@/store/businessStore";
import { formatNigerianCurrency, formatTimeAgo } from "@/lib/utils";
import UserProfileImage from "@vibaar/ui/common/UserProfileImage";
import StatusBadge from "@/features/seller-dashboard/StatusBadge";

/**
 * Shared customer-ranking row. Consolidates the two former copies (the live
 * Analytics>Customers tab and the now-deleted standalone /dashboard/customers
 * page). On-scale type + shared StatusBadge. Plain row — item layout untouched.
 */
const CustomerComp: React.FC<{ customer: CustomerRanking }> = ({ customer }) => {
  return (
    <div>
      <div className="flex items-start justify-between">
        <div className="w-10 h-10">
          <UserProfileImage
            src={customer.profile_image}
            firstName={customer.firstname}
            lastName={customer.lastname}
            userName={customer.user_name}
            size={40}
            className="w-full h-full"
          />
        </div>
        <div className="w-[60%]">
          <div className="flex items-center space-x-3">
            <p className="text-body-sm font-medium text-ink-90">
              {customer.firstname} {customer.lastname}
            </p>
            <StatusBadge status={customer.is_new ? "New" : "Returning"} />
          </div>
          <p className="text-caption text-ink-40">{customer.state}</p>
        </div>
        <div className="w-[20%]">
          <p className="text-body font-medium text-ink-90">
            ₦{formatNigerianCurrency(customer.total_spent)}
          </p>
          <p className="text-caption text-ink-40">Spent</p>
        </div>
      </div>
      <div className="ml-[55px] text-ink-40 font-medium text-caption space-x-3">
        <span>Orders:{formatNigerianCurrency(customer.total_orders)}</span>
        <span>Last purchase: {formatTimeAgo(customer.last_purchase)}</span>
      </div>
    </div>
  );
};

export default CustomerComp;
