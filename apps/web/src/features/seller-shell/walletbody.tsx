/* eslint-disable @typescript-eslint/no-explicit-any */
import { Suspense, useEffect, useState } from "react";
import EmptyState from "@vibaar/ui/common/EmptyState";
import Loader from "@vibaar/ui/common/Loader";
import PageShell from "@vibaar/ui/PageShell";
import HeroHeader from "@vibaar/ui/common/HeroHeader";
import Section from "@vibaar/ui/common/Section";
import ListSectionHeader from "@vibaar/ui/common/ListSectionHeader";
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
} from "@vibaar/ui/icons";
import IconButton from "@vibaar/ui/common/IconButton";

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

  const {
    walletAnalytics,
    walletTransactions,
    fetchWalletAnalytics,
    fetchWalletTransactions,
  } = useBusinessStore();

  // P12: the wallet page self-fetches its data so it works on a cold deep-link — it
  // previously relied on the dashboard home having prefetched wallet transactions.
  useEffect(() => {
    fetchWalletAnalytics();
    fetchWalletTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              variant="onBrand"
              onClick={action}
              className="-ml-2"
            />
            <p className="text-h2 font-medium text-white">Wallet</p>
          </div>
          <div className="flex items-center gap-2">
            <IconButton
              icon={!price ? MdVisibilityOff : MdVisibility}
              label={price ? "Hide balance" : "Show balance"}
              variant="onBrand"
              onClick={() => setPrice(!price)}
            />
            <IconButton
              icon={Settings}
              label="Wallet settings"
              variant="onBrand"
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
      <div className="rounded-field p-1 flex flex-col gap-3 text-foreground-secondary">
        <div className="w-full rounded-field bg-surface-subtle flex flex-col">
          <div className="w-full rounded-field flex justify-between items-center gap-2 p-3">
            <div className="items-center flex gap-2">
              <Clock size={18} className="text-foreground-secondary" />
              <p className="text-body-sm font-medium">Pending balance</p>
            </div>

            <div className="items-center flex gap-2">
              <p className="text-body-sm font-medium">
                {price ? "₦ " + walletAnalytics.clearing_balance : "******"}
              </p>
              <ChevronRight size={14} className="text-foreground-secondary" />
            </div>
          </div>
          <div className="w-full rounded-field flex justify-between items-center gap-2 p-3">
            <div className="items-center flex gap-2">
              <Package size={18} className="text-foreground-secondary" />
              <p className="text-body-sm font-medium">Order in Progress</p>
            </div>

            <div className="items-center flex gap-2">
              <p className="text-body-sm font-medium">
                {price ? "₦ " + walletAnalytics.orders_in_progress : "******"}
              </p>
              <ChevronRight size={14} className="text-foreground-secondary" />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full font-medium text-body text-foreground-primary p-3 gap-2">
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-[30px] h-[30px] rounded-full bg-brand/10 flex items-center justify-center">
              <Wallet size={18} className="text-brandDeep" />
            </div>
            <p className="text-body text-foreground-primary font-medium">Wallet Summary</p>
          </div>
          <div
            onClick={() => setSummary(!summary)}
            className="cursor-pointer">
            {summary ? (
              <ChevronUp size={20} className="text-foreground-secondary" />
            ) : (
              <ChevronDown size={20} className="text-foreground-secondary" />
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
              className="cursor-pointer rounded-field bg-surface-subtle p-3 flex-1 items-center gap-2"
              key={index}>
              <p className="flex items-center text-foreground-primary font-medium text-caption w-[90%] ">
                {_.title}
              </p>
              <p className="flex items-center text-foreground-primary font-normal text-h2 w-[90%] ">
                ₦ {_.path}
              </p>
            </div>
          ))}
        </div>
      </div>

      <Section className="font-medium text-body text-foreground-primary">
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
