/* eslint-disable @typescript-eslint/no-explicit-any */
import { Suspense, useState } from "react";
import EmptyState from "@/design-system/common/EmptyState";
import Loader from "@/design-system/common/Loader";
import PageShell from "@/design-system/PageShell";
import HeroHeader from "@/design-system/common/HeroHeader";
import Section from "@/design-system/common/Section";
import ListSectionHeader from "@/design-system/common/ListSectionHeader";
import { useRouter } from "next/navigation";
import { TransactionCard } from "@/design-system/selecticons";
import useBusinessStore from "@/store/businessStore";
import Image from "next/image";
import { DEFAULT_PATTERN } from "@/lib/bannerUtils";
import {
  BiArrowBack,
  MdVisibility,
  MdVisibilityOff,
  Settings,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Clock,
  Package,
  Wallet,
} from "@/design-system/icons";
import IconButton from "@/design-system/common/IconButton";

export default function WalletBody({ action }: { action: () => void }) {
  const router = useRouter();
  const [summary, setSummary] = useState(false);
  const [price, setPrice] = useState(true);
  // const data: {
  //   type: any;
  //   amount: string;
  //   icon: any;
  //   title: string;
  //   time: string;
  // }[] = [
  //   {
  //     type: "credit",
  //     amount: "50,000.00",
  //     icon: "topup",
  //     title: "Wallet Top Up",
  //     time: "Just now",
  //   },
  //   {
  //     type: "debit",
  //     amount: "12,300.00",
  //     icon: "billing",
  //     title: "Online Purchase",
  //     time: "Today, 3:15 PM",
  //   },
  //   {
  //     type: "credit",
  //     amount: "5,000.00",
  //     icon: "order",
  //     title: "Bank Transfer",
  //     time: "Yesterday",
  //   },
  //   {
  //     type: "pending",
  //     amount: "5,000.00",
  //     icon: "payoutpending",
  //     title: "Bank Transfer",
  //     time: "Yesterday",
  //   },
  //   {
  //     type: "credit",
  //     amount: "50,000.00",
  //     icon: "payout",
  //     title: "Bank Transfer",
  //     time: "Yesterday",
  //   },
  //   {
  //     type: "credit",
  //     amount: "5,000.00",
  //     icon: "billing",
  //     title: "Bank Transfer",
  //     time: "Yesterday",
  //   },
  //   {
  //     type: "debit",
  //     amount: "5,000.00",
  //     icon: "refund",
  //     title: "Bank Transfer",
  //     time: "Yesterday",
  //   },
  //   {
  //     type: "credit",
  //     amount: "500,000.00",
  //     icon: "refferal",
  //     title: "Bank Transfer",
  //     time: "Yesterday",
  //   },
  // ];

  const { walletAnalytics, walletTransactions } = useBusinessStore();

  const transactions = walletTransactions.map((item) => ({
    type:
      item.balance_before > item.balance_after ? "debit" : ("credit" as any),
    amount: item.amount,
    icon: "order" as any,
    title: item.type_description,
    time: "Yesterday",
  }));

  return (
    <Suspense fallback={<Loader />}>
      <PageShell
        hero={
          <HeroHeader
            backdrop={
              <Image
                src={DEFAULT_PATTERN}
                alt="Pattern"
                width={0}
                height={0}
                className="w-full h-full object-cover"
              />
            }
            topBar={
              <>
                <div className="flex items-center gap-1">
            <IconButton
              icon={BiArrowBack}
              label="Go back"
              variant="onDark"
              onClick={action}
              className="-ml-2"
            />
            <p className="text-h2 font-medium text-white">Wallet</p>
          </div>
          <div className="flex items-center gap-2">
            <IconButton
              icon={!price ? MdVisibilityOff : MdVisibility}
              label={price ? "Hide balance" : "Show balance"}
              variant="onDark"
              onClick={() => setPrice(!price)}
            />
            <IconButton
              icon={Settings}
              label="Wallet settings"
              variant="onDark"
              onClick={() => router.push("/dashboard/wallet/settings")}
            />
          </div>
              </>
            }>
            <div className="flex items-center justify-between">
          <div>
            <p className="text-body-sm font-normal">Available balance</p>
            <p className="text-h1 font-normal ">
              {price ? "₦" + walletAnalytics.available_balance : "******"}
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/payouts/withdraw")}
            className="border border-white rounded-pill px-4 py-1 text-body-sm font-medium text-white">
            Withdraw
          </button>
        </div>
          </HeroHeader>
        }>
      <div className="rounded-field p-1 flex flex-col gap-3 text-ink-60">
        <div className="w-full rounded-field bg-ink-3 flex flex-col">
          <div className="w-full rounded-field flex justify-between items-center gap-2 p-3">
            <div className="items-center flex gap-2">
              <Clock size={18} className="text-ink-60" />
              <p className="text-body-sm font-medium">Pending balance</p>
            </div>

            <div className="items-center flex gap-2">
              <p className="text-body-sm font-medium">
                {price ? "₦ " + walletAnalytics.clearing_balance : "******"}
              </p>
              <ChevronRight size={14} className="text-ink-60" />
            </div>
          </div>
          <div className="w-full rounded-field flex justify-between items-center gap-2 p-3">
            <div className="items-center flex gap-2">
              <Package size={18} className="text-ink-60" />
              <p className="text-body-sm font-medium">Order in Progress</p>
            </div>

            <div className="items-center flex gap-2">
              <p className="text-body-sm font-medium">
                {price ? "₦ " + walletAnalytics.orders_in_progress : "******"}
              </p>
              <ChevronRight size={14} className="text-ink-60" />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full font-medium text-body text-ink-90 p-3 gap-2">
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-[30px] h-[30px] rounded-full bg-instaRed/10 flex items-center justify-center">
              <Wallet size={18} className="text-instaRed" />
            </div>
            <p className="text-body text-ink-90 font-medium">Wallet Summary</p>
          </div>
          <div
            onClick={() => setSummary(!summary)}
            className="cursor-pointer">
            {summary ? (
              <ChevronUp size={20} className="text-ink-60" />
            ) : (
              <ChevronDown size={20} className="text-ink-60" />
            )}
          </div>
        </div>
        <div
          className={
            summary ? "w-full flex mt-2 gap-1" : "w-full hidden mt-2 gap-1"
          }>
          {[
            {
              title: "Total Withdrawn",
              path: price ? walletAnalytics.total_withdrawn : "******",
            },
            {
              title: "Total earnings to date",
              path: price ? walletAnalytics.total_earnings : "******",
            },
          ].map((_, index) => (
            <div
              className="cursor-pointer rounded-field bg-ink-3 p-3 flex-1 items-center gap-2"
              key={index}>
              <p className="flex items-center text-ink-90 font-medium text-caption w-[90%] ">
                {_.title}
              </p>
              <p className="flex items-center text-ink-90 font-normal text-h2 w-[90%] ">
                ₦ {_.path}
              </p>
            </div>
          ))}
        </div>
      </div>

      <Section className="font-medium text-body text-ink-90">
        <ListSectionHeader
          title="Recent transactions"
          action={{ label: "See All", onClick: () => router.push("/dashboard/transactions") }}
        />
        <div className="flex flex-col gap-2">
          {transactions.length > 0 ? (
            <div className="w-full">
              {transactions.map((it, i) => (
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
          ) : (
            <EmptyState
              image="/images/emptystate/activity_empty_state.svg"
              title="No recent activities yet."
              subtitle="Any activities on your store will appear here."
            />
          )}
        </div>
      </Section>
      </PageShell>
    </Suspense>
  );
}
