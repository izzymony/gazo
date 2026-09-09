/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import EmptyState from "@vibaar/ui/common/EmptyState";
import { getGreeting, formatNigerianCurrency, formatTrendForNigerianMarket } from "@/lib/utils";
import Image from "next/image";
import { DEFAULT_PATTERN } from "@/lib/bannerUtils";
import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import useBusinessStore from "@/store/businessStore";
import Loader from "@vibaar/ui/common/Loader";
import PageShell from "@vibaar/ui/PageShell";
import HeroHeader from "@vibaar/ui/common/HeroHeader";
import Section from "@vibaar/ui/common/Section";
import ListSectionHeader from "@vibaar/ui/common/ListSectionHeader";
import useAuthStore from "@/store/authStore";
import useChatStore from "@/store/chatStore";
import StoreLogo from "@vibaar/ui/common/StoreLogo";
import { SquareArrowUpRight, BubbleChat, Bell, ChevronRight, ShoppingBag, Tag } from "@vibaar/ui/icons";
import IconButton from "@vibaar/ui/common/IconButton";
import { useNotificationCount } from "@/hooks/useNotificationCount";
import TrendIndicator from "@vibaar/ui/common/TrendIndicator";
import { useNotifications, useMarkNotificationRead, type AppNotification } from "@/hooks/useNotifications";
import { iconFor, formatTime } from "@/features/notifications/notificationDisplay";
import ActivityItem from "@vibaar/ui/common/ActivityItem";
import StoreStatusBadge from "@vibaar/ui/common/StoreStatusBadge";
import NudgeBanner from "@/features/onboarding/NudgeBanner";
import List from "@vibaar/ui/common/List";
import Link from "next/link";

// Lazy-load the onboarding widgets — they pull in framer-motion and render only
// conditionally (new sellers), so this keeps framer-motion out of the dashboard's
// initial bundle. (Perf P3 — bundle.)
const SetupChecklist = dynamic(() => import("@/features/onboarding/SetupChecklist"), { ssr: false });
const DashboardWelcome = dynamic(() => import("@/features/onboarding/DashboardWelcome"), { ssr: false });

export default function SalesBody({ action }: { action: () => void }) {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [show, setShow] = useState(false);
  const { salesDashboardAnalytics, walletAnalytics, singleStore, store } =
    useBusinessStore();
  const { user } = useAuthStore();
  const chatUnread = useChatStore((s) => s.unreadCount);
  const getChatUnread = useChatStore((s) => s.getUnreadCount);
  useEffect(() => {
    getChatUnread();
  }, [getChatUnread]);

  // Note: Using 'store' instead of 'singleStore' for consistency with storefront
  const { unreadCount } = useNotificationCount("seller");
  // Dashboard preview reads the same Mailbox B seller feed as "See All", so the
  // two are consistent (retires the old Mailbox A /business/get-activities here).
  const { data: sellerNotifications = [], isLoading: activitiesLoading } = useNotifications("seller");
  const markRead = useMarkNotificationRead();
  const activities = sellerNotifications.slice(0, 6);

  // Type-safe utility to extract store logo/background image with safety checks
  const getStoreImageSrc = (storeData: typeof store): string | null => {
    try {
      const imageSrc = storeData?.business_setting?.personalised_settings?.background_image;
      // Ensure it's a valid string and not empty
      return (typeof imageSrc === 'string' && imageSrc.trim() !== '') ? imageSrc : null;
    } catch (error) {
      console.error('Error extracting store image:', error);
      return null;
    }
  };

  // Activity click handler - redirect based on activity type
  const handleActivityClick = (n: AppNotification) => {
    if (!n.isRead) markRead.mutate(n.id);
    if (n.actionUrl) router.push(n.actionUrl);
  };

  // console.log("first store details => ", singleStore);

  return (
    <Suspense fallback={<Loader />}>
      <PageShell
        hero={
          <HeroHeader
            className="pb-12"
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
          <div
            data-tour="store-link"
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push(`/dashboard/storefront`)}>
            <StoreLogo
              src={store?.logo as string | undefined}
              storeName={store?.name || "Your Store"}
              size={30}
              onClick={() => router.push(`/dashboard/storefront`)}
              className="ring-1 ring-brandInk ring-opacity-20"
            />
            <div className="text-caption font-normal">
              <p> {getGreeting()}</p>
              <div className="text-body font-medium flex items-center gap-1">
                {store?.name || "Your Store"}{" "}
                <SquareArrowUpRight size={14} className="text-brandInk" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative">
              <IconButton
                icon={BubbleChat}
                label="Inbox"
                variant="onBrand"
                onClick={() => router.push("/dashboard/inbox")}
              />
              {chatUnread > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-error-foreground text-white rounded-full flex items-center justify-center text-body-sm font-normal ring-1 ring-white z-10">
                  {chatUnread > 99 ? "99+" : chatUnread}
                </div>
              )}
            </div>
            <div className="relative">
              <IconButton
                icon={Bell}
                label="Notifications"
                variant="onBrand"
                onClick={() => router.push("/dashboard/notification")}
              />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-error-foreground text-white rounded-full flex items-center justify-center text-body-sm font-normal ring-1 ring-white z-10">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </div>
              )}
            </div>
          </div>
              </>
            }>
            <p className="font-medium text-body">
              Here&apos;s what is happening today 😃
            </p>
          </HeroHeader>
        }>
      <div data-tour="sales-analytics" className="relative z-30 -mt-14 px-2 bg-surface rounded-card p-2 flex flex-col gap-3 text-foreground-secondary">
        <div className="flex items-center justify-between w-full">
          <button
            className={`${tab === 0
              ? " bg-transparent  text-foreground-primary border-[0.5px] border-outline border-solid rounded-card py-1 "
              : "font-normal text-foreground-muted"
              } w-[48%] font-medium text-body-sm`}
            onClick={() => {
              setTab(0);
            }}>
            sale
          </button>
          <button
            className={`${tab === 1
              ? " bg-transparent  text-foreground-primary border-[0.5px] border-outline border-solid rounded-card py-1 "
              : "font-normal text-foreground-muted"
              } w-[48%] font-medium text-body-sm`}
            onClick={() => {
              setTab(1);
            }}>
            {" "}
            wallet
          </button>
        </div>
        {tab === 0 ? (
          <div className="w-full bg-surface-subtle rounded-field flex flex-col">
            <div className="w-full border-b flex flex-col gap-2 p-3">
              <div className="flex flex-row justify-between items-center">
                <p className="text-caption font-medium uppercase">
                  Total Revenue
                </p>

                <Link href={"/dashboard/analytics"} className="text-caption font-medium uppercase flex items-center gap-1 cursor-pointer">
                  View Details{" "}
                  <ChevronRight size={13} className="text-foreground-secondary" />
                </Link>
              </div>
              <p className="flex items-center gap-1 text-foreground-primary font-medium text-h1 ">
                ₦{formatNigerianCurrency(salesDashboardAnalytics.summary.revenue_generated)}
                <TrendIndicator
                  percentChange={salesDashboardAnalytics.percent_change.revenue_generated}
                  currentValue={salesDashboardAnalytics.summary.revenue_generated}
                  storeCreatedAt={store?.created_at}
                  className="text-caption ml-2"
                />
              </p>
            </div>
            <div className="flex p-3 items-center justify-between gap-1">
              {[
                {
                  val: salesDashboardAnalytics.summary.store_visitors,
                  change: salesDashboardAnalytics.percent_change.store_visitors,
                },
                {
                  val: salesDashboardAnalytics.summary.total_orders,
                  change: salesDashboardAnalytics.percent_change.total_orders,
                },
                {
                  val: salesDashboardAnalytics.summary.total_sales,
                  change: salesDashboardAnalytics.percent_change.total_sales,
                },
              ].map((_, index) => (
                <div
                  className="flex-1 flex flex-col rounded-field gap-1"
                  key={index}>
                  <p className="text-caption font-medium uppercase">
                    {index === 0
                      ? "Store visitors"
                      : index === 1
                        ? "Orders"
                        : "Sale"}
                  </p>
                  <p className="flex items-center gap-1 text-foreground-primary font-medium text-h2 ">
                    {formatNigerianCurrency(_.val)}
                    <TrendIndicator
                      percentChange={_.change}
                      currentValue={_.val}
                      storeCreatedAt={store?.created_at}
                      className="text-caption ml-1"
                    />
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full rounded-field bg-surface-subtle flex flex-col ">
            <div className="w-full border-b p-3 flex flex-col gap-3">
              <div className="w-full flex justify-between items-center ">
                <p className="text-caption font-medium uppercase">
                  Available balance
                </p>

                <button type="button"
                  onClick={action}
                  className="text-left text-caption font-medium uppercase flex items-center gap-1 cursor-pointer">
                  View Details{" "}
                  <ChevronRight size={13} className="text-foreground-secondary" />
                </button>
              </div>

              <div className="flex flex-row items-center justify-between">
                <p className="flex items-center gap-1 text-foreground-primary font-medium text-h1 ">
                  ₦{walletAnalytics.available_balance}
                </p>
                <div
                  onClick={action}
                  className="px-3 py-1 border-brandDeep border rounded-full">
                  <p className="ml-auto text-brandDeep text-body flex items-center">
                    Withdraw
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 p-3 justify-between gap-3">
              {" "}
              {[
                {
                  label: "Pending balance",
                  val: walletAnalytics?.clearing_balance || 0,
                },
                {
                  label: "Order in progress",
                  val: walletAnalytics?.orders_in_progress || 0,
                },
              ].map((item, index) => (
                <div className=" rounded-l flex flex-col gap-2" key={index}>
                  <p className="text-caption font-medium uppercase">
                    {item.label}
                  </p>

                  <p className="flex items-center gap-1 text-foreground-primary font-medium text-h2 ">
                    ₦ {item.val?.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Onboarding: Welcome + Checklist */}
      <div className="flex flex-col gap-3">
        <DashboardWelcome />
        <SetupChecklist />
      </div>

      {/* 7-day modal nudge for inactive users */}
      <NudgeBanner />

      <div data-tour="quick-actions" className="w-full font-medium text-body text-foreground-primary py-3">
        <p>Quick actions</p>
        <div className="w-full flex mt-3 gap-4">
          {[
            {
              icon: (
                <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
                  <ShoppingBag size={20} className="text-brandDeep" />
                </div>
              ),
              title: "Add new product",
              path: "/dashboard/catalog/product/create",
            },
            {
              icon: (
                <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
                  <Tag size={20} className="text-brandDeep" />
                </div>
              ),
              title: "Create a Discount",
              path: "/dashboard/catalog/discount/new",
            },
          ].map((_, index) => (
            <Link href={_.path} className="cursor-pointer rounded-card bg-surface-subtle p-3 flex flex-row items-center flex-1 gap-3 min-h-[60px] transition-all duration-200 active:scale-95 hover:bg-surface-muted" key={index}>
              <div>{_.icon}</div>
              <p className="flex items-center text-foreground-primary font-medium text-body w-[90%] ">
                {_.title}
              </p>
            </Link>
          ))}
        </div>
      </div>
      <Section className="pb-3 font-medium text-body text-foreground-primary">
        <div data-tour="recent-activities" className="flex flex-col gap-3">
        <ListSectionHeader
          title="Recent activities"
          action={{ label: "See All", onClick: () => router.push("/dashboard/notification") }}
        />
        <div className="flex flex-col">
          {activitiesLoading ? (
            <Loader variant="inline" text="Loading activities..." className="py-4" />
          ) : activities.length > 0 ? (
            <List label="Recent activities" className="divide-y-0">
              {activities.map((n) => (
                <ActivityItem
                  key={n.id}
                  asListItem
                  icon={iconFor(n)}
                  title={n.title}
                  message={n.message}
                  time={formatTime(n.createdAt)}
                  unread={!n.isRead}
                  onClick={() => handleActivityClick(n)}
                />
              ))}
            </List>
          ) : (
            <div className="py-12">
              <EmptyState
                image="/images/emptystate/activity_empty_state.svg"
                title="No recent activities yet."
                subtitle="Any activities on your store will appear here."
              />
            </div>
          )}
        </div>
        </div>
      </Section>
      {show && <Modall action={() => setShow(!show)} router={router} />}
      </PageShell>
    </Suspense>
  );
}

export const SocialButton = ({
  sub,
  text,
  action,
}: {
  text: "instagram" | "tiktok" | "upload";
  sub: string;
  action: () => void;
}) => {
  const icons = {
    instagram: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path
          d="M10.0006 2C7.82789 2 7.55522 2.0095 6.70188 2.04833C5.85021 2.08733 5.26887 2.22217 4.7602 2.42C4.23402 2.62433 3.78769 2.89767 3.34301 3.3425C2.89801 3.78717 2.62467 4.2335 2.41967 4.7595C2.22134 5.26833 2.08633 5.84983 2.048 6.70117C2.01 7.5545 2 7.82733 2 10C2 12.1727 2.00967 12.4445 2.04833 13.2978C2.0875 14.1495 2.22234 14.7308 2.42 15.2395C2.62451 15.7657 2.89784 16.212 3.34268 16.6567C3.78719 17.1017 4.23352 17.3757 4.75936 17.58C5.26837 17.7778 5.84987 17.9127 6.70138 17.9517C7.55473 17.9905 7.82723 18 9.99975 18C12.1726 18 12.4444 17.9905 13.2978 17.9517C14.1495 17.9127 14.7315 17.7778 15.2405 17.58C15.7665 17.3757 16.2121 17.1017 16.6567 16.6567C17.1017 16.212 17.375 15.7657 17.58 15.2397C17.7767 14.7308 17.9117 14.1493 17.9517 13.298C17.99 12.4447 18 12.1727 18 10C18 7.82733 17.99 7.55467 17.9517 6.70133C17.9117 5.84967 17.7767 5.26833 17.58 4.75967C17.375 4.2335 17.1017 3.78717 16.6567 3.3425C16.2116 2.8975 15.7666 2.62417 15.24 2.42C14.73 2.22217 14.1483 2.08733 13.2966 2.04833C12.4433 2.0095 12.1716 2 9.99825 2H10.0006ZM9.28291 3.44167C9.49591 3.44133 9.73358 3.44167 10.0006 3.44167C12.1366 3.44167 12.3898 3.44933 13.2333 3.48767C14.0133 3.52333 14.4366 3.65367 14.7186 3.76317C15.092 3.90817 15.3581 4.0815 15.638 4.3615C15.918 4.6415 16.0913 4.90817 16.2366 5.2815C16.3462 5.56317 16.4767 5.9865 16.5122 6.7665C16.5505 7.60983 16.5588 7.86317 16.5588 9.99817C16.5588 12.1332 16.5505 12.3865 16.5122 13.2298C16.4765 14.0098 16.3462 14.4332 16.2366 14.7148C16.0916 15.0882 15.918 15.354 15.638 15.6338C15.358 15.9138 15.0921 16.0872 14.7186 16.2322C14.437 16.3422 14.0133 16.4722 13.2333 16.5078C12.3899 16.5462 12.1366 16.5545 10.0006 16.5545C7.86439 16.5545 7.61123 16.5462 6.76788 16.5078C5.98787 16.4718 5.56454 16.3415 5.28237 16.232C4.90903 16.087 4.64236 15.9137 4.36236 15.6337C4.08236 15.3537 3.90902 15.0877 3.76369 14.7142C3.65418 14.4325 3.52368 14.0092 3.48818 13.2292C3.44985 12.3858 3.44218 12.1325 3.44218 9.99617C3.44218 7.85983 3.44985 7.60783 3.48818 6.7645C3.52385 5.9845 3.65418 5.56117 3.76369 5.27917C3.90869 4.90583 4.08236 4.63917 4.36236 4.35917C4.64236 4.07917 4.90903 3.90583 5.28237 3.7605C5.56437 3.6505 5.98787 3.5205 6.76788 3.48467C7.50589 3.45133 7.79189 3.44133 9.28291 3.43967V3.44167Z"
          fill="url(#paint0_radial_9897_89117)"
        />
        <path
          d="M14.2538 4.75035C14.0639 4.75035 13.8783 4.80666 13.7204 4.91216C13.5625 5.01766 13.4394 5.16761 13.3668 5.34305C13.2941 5.51849 13.2751 5.71153 13.3122 5.89776C13.3493 6.08399 13.4408 6.25504 13.575 6.38929C13.7093 6.52353 13.8804 6.61494 14.0667 6.65194C14.2529 6.68895 14.446 6.66989 14.6214 6.59718C14.7968 6.52447 14.9467 6.40137 15.0521 6.24345C15.1576 6.08554 15.2138 5.8999 15.2138 5.71002C15.2138 5.18002 14.7838 4.75002 14.2538 4.75002V4.75035Z"
          fill="url(#paint1_radial_9897_89117)"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M9.98338 5.87201C7.71452 5.87201 5.875 7.71151 5.875 9.98035C5.875 12.2492 7.71452 14.0878 9.98338 14.0878C12.2522 14.0878 14.0913 12.2492 14.0913 9.98035C14.0913 7.71151 12.2522 5.87201 9.98338 5.87201ZM10 12.625C11.4498 12.625 12.625 11.4498 12.625 10C12.625 8.55027 11.4498 7.37502 10 7.37502C8.55026 7.37502 7.375 8.55027 7.375 10C7.375 11.4498 8.55026 12.625 10 12.625Z"
          fill="url(#paint2_radial_9897_89117)"
        />
        <path
          d="M10.0006 2C7.82789 2 7.55522 2.0095 6.70188 2.04833C5.85021 2.08733 5.26887 2.22217 4.7602 2.42C4.23402 2.62433 3.78769 2.89767 3.34301 3.3425C2.89801 3.78717 2.62467 4.2335 2.41967 4.7595C2.22134 5.26833 2.08633 5.84983 2.048 6.70117C2.01 7.5545 2 7.82733 2 10C2 12.1727 2.00967 12.4445 2.04833 13.2978C2.0875 14.1495 2.22234 14.7308 2.42 15.2395C2.62451 15.7657 2.89784 16.212 3.34268 16.6567C3.78719 17.1017 4.23352 17.3757 4.75936 17.58C5.26837 17.7778 5.84987 17.9127 6.70138 17.9517C7.55473 17.9905 7.82723 18 9.99975 18C12.1726 18 12.4444 17.9905 13.2978 17.9517C14.1495 17.9127 14.7315 17.7778 15.2405 17.58C15.7665 17.3757 16.2121 17.1017 16.6567 16.6567C17.1017 16.212 17.375 15.7657 17.58 15.2397C17.7767 14.7308 17.9117 14.1493 17.9517 13.298C17.99 12.4447 18 12.1727 18 10C18 7.82733 17.99 7.55467 17.9517 6.70133C17.9117 5.84967 17.7767 5.26833 17.58 4.75967C17.375 4.2335 17.1017 3.78717 16.6567 3.3425C16.2116 2.8975 15.7666 2.62417 15.24 2.42C14.73 2.22217 14.1483 2.08733 13.2966 2.04833C12.4433 2.0095 12.1716 2 9.99825 2H10.0006ZM9.28291 3.44167C9.49591 3.44133 9.73358 3.44167 10.0006 3.44167C12.1366 3.44167 12.3898 3.44933 13.2333 3.48767C14.0133 3.52333 14.4366 3.65367 14.7186 3.76317C15.092 3.90817 15.3581 4.0815 15.638 4.3615C15.918 4.6415 16.0913 4.90817 16.2367 5.2815C16.3462 5.56317 16.4767 5.9865 16.5122 6.7665C16.5505 7.60983 16.5588 7.86317 16.5588 9.99817C16.5588 12.1332 16.5505 12.3865 16.5122 13.2298C16.4765 14.0098 16.3462 14.4332 16.2367 14.7148C16.0916 15.0882 15.918 15.354 15.638 15.6338C15.358 15.9138 15.0921 16.0872 14.7186 16.2322C14.437 16.3422 14.0133 16.4722 13.2333 16.5078C12.3899 16.5462 12.1366 16.5545 10.0006 16.5545C7.86439 16.5545 7.61123 16.5462 6.76788 16.5078C5.98787 16.4718 5.56454 16.3415 5.28237 16.232C4.90903 16.087 4.64236 15.9137 4.36236 15.6337C4.08236 15.3537 3.90902 15.0877 3.76369 14.7142C3.65418 14.4325 3.52368 14.0092 3.48818 13.2292C3.44985 12.3858 3.44218 12.1325 3.44218 9.99617C3.44218 7.85983 3.44985 7.60783 3.48818 6.7645C3.52385 5.9845 3.65418 5.56117 3.76369 5.27917C3.90869 4.90583 4.08236 4.63917 4.36236 4.35917C4.64236 4.07917 4.90903 3.90583 5.28237 3.7605C5.56437 3.6505 5.98787 3.5205 6.76788 3.48467C7.50589 3.45133 7.79189 3.44133 9.28291 3.43967V3.44167Z"
          fill="url(#paint3_radial_9897_89117)"
        />
        <path
          d="M14.2538 4.75035C14.0639 4.75035 13.8783 4.80666 13.7204 4.91216C13.5625 5.01766 13.4394 5.16761 13.3668 5.34305C13.2941 5.51849 13.2751 5.71153 13.3122 5.89776C13.3493 6.08399 13.4408 6.25504 13.575 6.38929C13.7093 6.52353 13.8804 6.61494 14.0667 6.65194C14.2529 6.68895 14.446 6.66989 14.6214 6.59718C14.7968 6.52447 14.9467 6.40137 15.0521 6.24345C15.1576 6.08554 15.2138 5.8999 15.2138 5.71002C15.2138 5.18002 14.7838 4.75035 14.2538 4.75035Z"
          fill="url(#paint4_radial_9897_89117)"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M9.98338 5.87201C7.71452 5.87201 5.875 7.71151 5.875 9.98035C5.875 12.2492 7.71452 14.0878 9.98338 14.0878C12.2522 14.0878 14.0913 12.2492 14.0913 9.98035C14.0913 7.71151 12.2522 5.87201 9.98338 5.87201ZM10 12.625C11.4498 12.625 12.625 11.4498 12.625 10C12.625 8.55027 11.4498 7.37502 10 7.37502C8.55026 7.37502 7.375 8.55027 7.375 10C7.375 11.4498 8.55026 12.625 10 12.625Z"
          fill="url(#paint5_radial_9897_89117)"
        />
        <defs>
          <radialGradient
            id="paint0_radial_9897_89117"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(6.25002 19.2323) rotate(-90) scale(15.8572 14.7484)">
            <stop stopColor="#FFDD55" />
            <stop offset="0.1" stopColor="#FFDD55" />
            <stop offset="0.5" stopColor="#FF543E" />
            <stop offset="1" stopColor="#C837AB" />
          </radialGradient>
          <radialGradient
            id="paint1_radial_9897_89117"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(6.25002 19.2323) rotate(-90) scale(15.8572 14.7484)">
            <stop stopColor="#FFDD55" />
            <stop offset="0.1" stopColor="#FFDD55" />
            <stop offset="0.5" stopColor="#FF543E" />
            <stop offset="1" stopColor="#C837AB" />
          </radialGradient>
          <radialGradient
            id="paint2_radial_9897_89117"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(6.25002 19.2323) rotate(-90) scale(15.8572 14.7484)">
            <stop stopColor="#FFDD55" />
            <stop offset="0.1" stopColor="#FFDD55" />
            <stop offset="0.5" stopColor="#FF543E" />
            <stop offset="1" stopColor="#C837AB" />
          </radialGradient>
          <radialGradient
            id="paint3_radial_9897_89117"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(-0.680085 3.15261) rotate(78.6806) scale(7.08823 29.218)">
            <stop stopColor="#3771C8" />
            <stop offset="0.128" stopColor="#3771C8" />
            <stop offset="1" stopColor="#6600FF" stopOpacity="0" />
          </radialGradient>
          <radialGradient
            id="paint4_radial_9897_89117"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(-0.680085 3.15261) rotate(78.6806) scale(7.08823 29.218)">
            <stop stopColor="#3771C8" />
            <stop offset="0.128" stopColor="#3771C8" />
            <stop offset="1" stopColor="#6600FF" stopOpacity="0" />
          </radialGradient>
          <radialGradient
            id="paint5_radial_9897_89117"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(-0.680085 3.15261) rotate(78.6806) scale(7.08823 29.218)">
            <stop stopColor="#3771C8" />
            <stop offset="0.128" stopColor="#3771C8" />
            <stop offset="1" stopColor="#6600FF" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    ),
    tiktok: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M8.52094 8.30441V7.68044C8.30433 7.64978 8.08593 7.63385 7.86716 7.63281C5.19202 7.63281 3.01562 9.80921 3.01562 12.4839C3.01562 14.1246 3.83576 15.577 5.08685 16.4552C4.24914 15.5595 3.78341 14.3788 3.78409 13.1526C3.78409 10.516 5.89855 8.36597 8.52094 8.30441Z"
          fill="#00F2EA"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M8.63585 15.3653C9.8294 15.3653 10.8031 14.416 10.8474 13.2329L10.8515 2.6716H12.7812C12.74 2.45109 12.7192 2.22726 12.7189 2.00293H10.0834L10.079 12.5646C10.035 13.7473 9.06096 14.6963 7.86776 14.6963C7.50952 14.6964 7.15668 14.6092 6.83984 14.442C7.04441 14.7274 7.31402 14.96 7.62633 15.1205C7.93863 15.2811 8.28467 15.365 8.63585 15.3653ZM16.3868 6.25798V5.671C15.6776 5.67167 14.9836 5.4654 14.39 5.07745C14.9105 5.67663 15.6113 6.09084 16.3872 6.25798"
          fill="#00F2EA"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M14.3917 5.06761C13.81 4.40204 13.4895 3.548 13.4899 2.66406H12.7837C12.8752 3.15263 13.0648 3.61756 13.3412 4.03071C13.6176 4.44385 13.975 4.7966 14.3917 5.06761ZM7.86796 10.2612C7.28054 10.2619 6.7174 10.4955 6.30202 10.9108C5.88668 11.3261 5.65304 11.8891 5.65234 12.4765C5.65274 12.8805 5.76355 13.2767 5.97282 13.6223C6.18209 13.9679 6.48183 14.2497 6.83967 14.4374C6.5672 14.0617 6.42049 13.6095 6.42046 13.1455C6.42103 12.5581 6.65463 11.995 7.07001 11.5796C7.48538 11.1643 8.04859 10.9306 8.63607 10.9299C8.86438 10.9299 9.08315 10.9677 9.28982 11.0325V8.34206C9.07325 8.3114 8.85481 8.29547 8.63607 8.29444C8.59757 8.29444 8.55984 8.29664 8.52174 8.29737V10.3639C8.3103 10.2966 8.08983 10.262 7.86796 10.2612Z"
          fill="#FF004F"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M16.3827 6.25818V8.30633C15.0158 8.30633 13.7496 7.86923 12.7155 7.12728V12.4829C12.7155 15.1575 10.5395 17.3336 7.86432 17.3336C6.83053 17.3336 5.87188 17.0075 5.08398 16.4542C5.53697 16.9426 6.08595 17.3322 6.69656 17.5986C7.30717 17.865 7.96622 18.0024 8.6324 18.0022C11.3076 18.0022 13.484 15.8262 13.484 13.1519V7.79631C14.5523 8.56439 15.8352 8.97689 17.1511 8.97536V6.33953C16.8873 6.33953 16.6307 6.31094 16.3827 6.25781"
          fill="#FF004F"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12.7194 12.48V7.12443C13.7877 7.89258 15.0707 8.30508 16.3866 8.30348V6.25534C15.6107 6.08803 14.9101 5.67369 14.3898 5.07445C13.973 4.80344 13.6156 4.45069 13.3392 4.03754C13.0628 3.6244 12.8732 3.15947 12.7817 2.6709H10.8519L10.8479 13.2322C10.8036 14.4149 9.82989 15.3643 8.63634 15.3643C8.28516 15.3639 7.93912 15.28 7.62681 15.1194C7.31454 14.9589 7.04494 14.7263 6.84033 14.441C6.48242 14.2534 6.18259 13.9715 5.97325 13.6259C5.76391 13.2803 5.65304 12.8841 5.65264 12.48C5.65331 11.8927 5.88695 11.3296 6.30232 10.9144C6.71766 10.4991 7.28084 10.2655 7.86825 10.2648C8.09619 10.2648 8.31496 10.3022 8.522 10.3674V8.30092C5.89961 8.36247 3.78516 10.5125 3.78516 13.1491C3.78516 14.4241 4.28061 15.5849 5.08792 16.4517C5.90178 17.0246 6.87297 17.3316 7.86825 17.3307C10.5434 17.3307 12.7194 15.1547 12.7194 12.48Z"
          fill="black"
        />
      </svg>
    ),
    upload: (
      <SquareArrowUpRight size={20} className="text-foreground-primary" />
    ),
  };

  return (
    <div
      onClick={action}
      className="flex gap-3 items-center rounded-full border bg-surface justify-center text-foreground-secondary text-body-lg font-normal tracking-wider py-3 px-5">
      <div>{icons[text]}</div>
      <p>{sub}</p>
    </div>
  );
};

export const Modall = ({
  action, router
}: {
  action: () => void;
  router: any;
}) => (
  <button type="button"
    onClick={action}
    className="text-left flex-1 absolute top-0 bottom-0 left-0 right-0 bg-black/20 flex-col flex justify-end">
    <div className="flex flex-col items-center bg-surface rounded-t-3xl mb-[60px] px-4 pt-10 pb-10">
      <div className="relative mb-3">
        <svg
          width="298"
          height="347"
          viewBox="0 0 298 347"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <g opacity="0.2">
            <path
              d="M199.914 237.927C187.347 229.172 177.055 219.703 169.316 209.426L170.804 213.021C178.143 220.713 184.987 229.058 191.337 238.047L194.725 242.842C196.5 241.255 198.23 239.617 199.914 237.927Z"
              fill="var(--brand)"
            />
            <path
              d="M169.232 211.26L172.712 217.297L170.952 213.04C170.381 212.443 169.808 211.849 169.232 211.26Z"
              fill="var(--brand)"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M237.085 317.257C248.286 317.257 257.366 308.176 257.366 296.974C257.366 285.772 248.286 276.691 237.085 276.691C225.883 276.691 216.803 285.772 216.803 296.974C216.803 308.176 225.883 317.257 237.085 317.257ZM237.085 346.759C264.578 346.759 286.867 324.47 286.867 296.974C286.867 269.478 264.578 247.188 237.085 247.188C209.591 247.188 187.303 269.478 187.303 296.974C187.303 324.47 209.591 346.759 237.085 346.759Z"
              fill="var(--brand)"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M96.9538 317.257C105.792 317.257 113.31 311.603 116.088 303.715C116.831 301.606 117.235 299.337 117.235 296.974C117.235 295.491 117.076 294.044 116.774 292.652C116.031 289.227 114.423 286.126 112.19 283.587C108.474 279.359 103.025 276.691 96.9538 276.691C93.1313 276.691 89.5555 277.748 86.5033 279.587C83.2081 281.572 80.5232 284.468 78.797 287.926C77.4374 290.65 76.6723 293.723 76.6723 296.974C76.6723 297.6 76.7007 298.22 76.7563 298.832C77.6945 309.163 86.379 317.257 96.9538 317.257ZM96.9538 346.759C124.447 346.759 146.736 324.47 146.736 296.974C146.736 269.478 124.447 247.188 96.9538 247.188C69.4602 247.188 47.1719 269.478 47.1719 296.974C47.1719 324.47 69.4602 346.759 96.9538 346.759Z"
              fill="var(--brand)"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M199.973 237.929C187.406 229.174 177.114 219.704 169.375 209.427L170.863 213.023C170.292 212.425 169.719 211.832 169.143 211.242C161.6 201.101 155.952 188.889 151.962 178.334C148.11 168.146 145.563 158.101 144.408 148.221L144.4 148.15L144.392 148.08C143.438 138.895 142.95 130.326 142.95 122.39C142.95 109.021 144.225 96.637 146.87 85.3026L146.879 85.2598L146.89 85.2167C149.583 74.077 153.121 63.9525 157.573 54.9207L157.587 54.8927L157.601 54.8647C162.104 45.8565 167.325 37.8547 173.315 30.9525L173.354 30.9079L173.393 30.8638C179.321 24.1776 185.632 18.4806 192.349 13.8701C198.953 9.33803 205.75 5.83809 212.742 3.50742L212.772 3.49731L212.803 3.48738C219.674 1.24089 226.434 0.000976562 233.007 0.000976562C242.956 0.000976562 252.231 2.73899 260.579 8.143C268.75 13.3181 275.496 20.536 280.938 29.4078C286.51 38.1873 290.644 48.4612 293.511 60.0265C296.538 71.6589 298 84.2877 298 97.8426C298 115.568 296.13 132.96 292.383 150.003L292.38 150.02C288.634 166.94 283.126 183.056 275.847 198.346C268.67 213.55 259.835 227.569 249.344 240.379C238.8 253.254 226.764 264.434 213.25 273.894L213.233 273.906C199.736 283.318 184.856 290.594 168.65 295.756C152.354 301.1 134.947 303.725 116.504 303.725C116.39 303.725 116.277 303.725 116.163 303.725C116.906 301.616 117.31 299.347 117.31 296.983C117.31 295.501 117.151 294.054 116.849 292.662C131.234 292.634 144.83 290.911 157.637 287.491L157.664 287.484C160.224 286.8 162.752 286.048 165.248 285.229C170.328 283.612 175.26 281.778 180.045 279.724C189.586 275.629 198.54 270.664 206.906 264.831C219.582 255.957 230.875 245.47 240.785 233.369C250.696 221.269 259.05 208.015 265.849 193.61C272.764 179.089 278.006 163.762 281.579 147.628C285.151 131.379 286.937 114.784 286.937 97.8426C286.937 85.0507 285.555 73.3534 282.789 62.751C280.139 52.0335 276.393 42.8716 271.553 35.2655C266.829 27.5442 261.182 21.6092 254.614 17.4604C254.254 17.227 253.893 16.9999 253.529 16.7793C253.023 16.4719 252.513 16.1769 252 15.8943C251.899 15.8393 251.799 15.7848 251.699 15.7307C245.931 12.6198 239.7 11.0644 233.007 11.0644C227.821 11.0644 222.232 12.0439 216.24 14.0031C212.978 15.0904 209.717 16.4972 206.455 18.2235C203.84 19.6076 201.224 21.1971 198.609 22.9921C192.732 27.0256 187.086 32.0963 181.669 38.2043C176.368 44.312 171.644 51.515 167.495 59.8126C163.462 67.9947 160.178 77.3296 157.643 87.8166C155.223 98.1885 154.013 109.713 154.013 122.39C154.013 129.881 154.474 138.063 155.395 146.937C156.433 155.81 158.738 164.972 162.31 174.422C165.882 183.872 171.183 193.322 178.212 202.772C179.867 204.97 181.666 207.141 183.608 209.288C186.055 211.992 188.73 214.656 191.633 217.279L191.723 217.36C196.281 221.471 201.4 225.482 207.079 229.393L211.746 223.343C211.682 223.298 211.617 223.253 211.552 223.208C211.505 223.174 211.457 223.14 211.408 223.106C210.218 222.264 209.013 221.326 207.794 220.295C204.872 217.82 201.867 214.803 198.782 211.242C196.582 208.637 194.455 205.726 192.4 202.51C190.365 199.324 188.402 195.839 186.509 192.054C182.822 184.448 179.768 175.575 177.348 165.433C175.044 155.176 173.891 143.594 173.891 130.687C173.891 113.286 175.677 97.7275 179.25 84.0133C182.822 70.2995 187.431 58.7177 193.078 49.2677C198.823 39.8439 205.2 32.6549 212.206 27.7008L212.265 27.6594C214.636 25.9872 216.995 24.5972 219.341 23.4893L219.394 23.4645C223.982 21.3057 228.52 20.2262 233.007 20.2262C237.271 20.2262 241.477 21.7244 245.625 24.7207C246.19 25.1023 246.746 25.5091 247.292 25.9413C250.872 28.7718 254.061 32.6866 256.861 37.6858C260.087 43.3326 262.68 50.4201 264.639 58.9481C266.713 67.3607 267.751 77.1566 267.751 88.3351C267.751 96.9785 267.059 106.428 265.676 116.685C264.409 126.826 262.392 137.314 259.626 148.147C256.861 158.864 253.346 169.697 249.082 180.645C244.819 191.478 239.633 201.965 233.525 212.107C227.533 222.133 220.677 231.525 212.956 240.284C212.304 241.013 211.645 241.735 210.979 242.45C210.398 243.073 209.812 243.69 209.22 244.301C202.46 251.286 195.005 257.496 186.855 262.929C183.166 265.389 179.326 267.647 175.336 269.705C171.116 271.881 166.728 273.833 162.172 275.56L162.085 275.592C159.672 276.505 157.212 277.354 154.704 278.141C143.065 281.829 130.332 283.673 116.504 283.673C115.084 283.673 113.671 283.648 112.265 283.596C108.549 279.369 103.1 276.701 97.0286 276.701C93.2061 276.701 89.6303 277.758 86.5781 279.597C85.7182 279.353 84.8608 279.098 84.0068 278.833C81.7695 278.137 79.5884 277.384 77.4632 276.575C74.98 275.63 72.5739 274.608 70.2445 273.509C65.3282 271.189 60.7542 268.527 56.5231 265.522C48.572 259.76 42.2339 253.018 37.5094 245.297C32.7846 237.46 30.4223 228.99 30.4223 219.886C30.4223 214.93 31.2289 210.32 32.8422 206.056C34.4555 201.793 36.933 198.162 40.275 195.166C43.7321 192.17 48.0532 189.807 53.239 188.078C57.764 186.57 63.0788 185.72 69.1832 185.528C70.0745 185.5 70.9824 185.486 71.9072 185.486C78.7163 185.486 86.1537 186.48 94.2187 188.469L94.2449 188.475C94.6336 188.571 95.0237 188.669 95.4153 188.77C103.943 190.959 112.701 194.59 121.689 199.66C122.598 200.173 123.508 200.702 124.419 201.247L124.457 201.27C132.534 206.107 140.657 212.197 148.827 219.54C149.729 220.351 150.627 221.179 151.521 222.026C159.651 229.727 167.453 238.925 174.928 249.618L174.933 249.615L182.361 244.432L182.356 244.426C180.21 241.389 178.008 238.432 175.749 235.556C170.123 228.394 164.145 221.73 157.816 215.564C156.85 214.624 155.877 213.698 154.895 212.788C146.853 205.331 138.262 198.881 129.122 193.437C128.145 192.849 127.162 192.273 126.174 191.71C117.159 186.573 107.699 182.506 97.793 179.508C97.6817 179.475 97.5703 179.441 97.4586 179.408C97.2963 179.359 97.1337 179.31 96.9711 179.262C88.8592 176.837 80.5047 175.292 71.9072 174.626C71.0572 174.56 70.2047 174.503 69.3495 174.455C66.9367 174.318 64.5052 174.249 62.0544 174.249C55.6012 174.249 49.321 175.056 43.2136 176.669C37.106 178.167 31.6322 180.703 26.7923 184.276C22.0677 187.848 18.2649 192.573 15.384 198.45C12.5031 204.328 11.0626 211.646 11.0626 220.404C11.0626 229.739 13.7131 238.786 19.0139 247.544C24.3148 256.188 31.6322 263.851 40.9664 270.535C48.2092 275.722 56.5275 280.111 65.9216 283.701C68.6338 284.738 71.4356 285.708 74.327 286.612C75.8263 287.08 77.3415 287.522 78.8719 287.936C77.5123 290.66 76.7471 293.732 76.7471 296.983C76.7471 297.61 76.7755 298.23 76.8312 298.842C74.8764 298.327 72.9419 297.77 71.0273 297.171C57.192 292.848 44.9697 287.009 34.5258 279.53C24.1492 272.1 15.7525 263.387 9.58372 253.328L9.56668 253.301L9.54983 253.273C3.30771 242.959 0 231.951 0 220.404C0 210.502 1.6195 201.397 5.4506 193.581C9.01274 186.313 13.8738 180.174 20.1204 175.451L20.1713 175.412L20.2228 175.374C26.2663 170.913 33.057 167.782 40.4815 165.948C47.5015 164.103 54.7011 163.186 62.0544 163.186C75.1828 163.186 87.8876 165.001 100.127 168.659C112.31 172.266 123.875 177.365 134.804 183.945C145.825 190.511 156.069 198.419 165.534 207.639C166.75 208.823 167.953 210.025 169.143 211.242L172.623 217.279L170.863 213.023C178.202 220.715 185.046 229.06 191.396 238.049L194.784 242.844C196.559 241.256 198.289 239.618 199.973 237.929ZM238.781 176.612C242.89 166.059 246.263 155.655 248.911 145.398C251.571 134.977 253.495 124.95 254.699 115.313L254.706 115.26L254.713 115.207C256.042 105.348 256.688 96.3988 256.688 88.3351C256.688 77.806 255.708 68.9347 253.898 61.5967L253.877 61.5112L253.857 61.4252C252.063 53.6137 249.796 47.6196 247.256 43.1747L247.232 43.133L247.208 43.0914C244.594 38.4219 241.918 35.5677 239.432 33.8877L239.288 33.7909L239.148 33.6896C236.499 31.7758 234.51 31.2896 233.007 31.2896C229.03 31.2896 224.298 32.7117 218.638 36.702C213.156 40.5667 207.731 46.4952 202.549 54.9856C197.579 63.3138 193.329 73.8502 189.955 86.8024C186.666 99.4268 184.953 114.022 184.953 130.687C184.953 142.924 186.045 153.648 188.125 162.937C190.391 172.412 193.187 180.456 196.435 187.168C199.916 194.121 203.524 199.7 207.19 204.052C211.26 208.742 214.893 212.059 218.056 214.256L218.751 214.738C220.583 212.023 222.343 209.253 224.03 206.431L224.049 206.399C229.84 196.783 234.748 186.855 238.781 176.612ZM47.5911 203.465C45.6246 205.247 44.1742 207.368 43.1889 209.972C42.0886 212.88 41.4849 216.151 41.4849 219.886C41.4849 226.954 43.2863 233.441 46.9642 239.553C50.8546 245.901 56.1333 251.569 62.9719 256.532C69.8602 261.417 77.9308 265.356 87.2931 268.269C96.5588 271.152 106.28 272.61 116.504 272.61C129.346 272.61 140.937 270.898 151.363 267.595L151.393 267.585C157.62 265.631 163.497 263.267 169.035 260.497L165.861 255.957C157.962 244.657 149.806 235.295 141.432 227.768C132.821 220.029 124.424 213.906 116.254 209.297C107.968 204.622 100.109 201.397 92.664 199.486C84.8365 197.476 77.9385 196.549 71.9072 196.549C65.4706 196.549 60.4935 197.322 56.7374 198.574C52.7098 199.917 49.7535 201.61 47.5911 203.465Z"
              fill="var(--brand)"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M178.255 202.813C185.285 212.148 194.907 221.022 207.122 229.434L211.789 223.384C207.64 220.503 203.319 216.469 198.825 211.283C194.446 206.098 190.355 199.701 186.552 192.095C182.864 184.489 179.811 175.616 177.391 165.474C175.086 155.217 173.934 143.636 173.934 130.728C173.934 113.327 175.72 97.7686 179.292 84.0544C182.864 70.3406 187.474 58.7588 193.121 49.3088C198.882 39.8588 205.278 32.656 212.307 27.7005C219.337 22.7451 226.251 20.2673 233.05 20.2673C237.314 20.2673 241.52 21.7655 245.668 24.7618C249.932 27.6429 253.677 31.9645 256.903 37.7269C260.13 43.3737 262.723 50.4612 264.682 58.9892C266.756 67.4018 267.794 77.1977 267.794 88.3762C267.794 97.0196 267.102 106.47 265.719 116.726C264.451 126.867 262.435 137.355 259.669 148.188C256.903 158.905 253.389 169.738 249.125 180.686C244.861 191.519 239.676 202.006 233.568 212.148C227.576 222.174 220.72 231.566 212.999 240.325C205.278 248.968 196.578 256.517 186.898 262.97C177.218 269.424 166.501 274.495 154.747 278.182C143.108 281.87 130.375 283.714 116.546 283.714C115.126 283.714 113.714 283.689 112.308 283.637C114.54 286.177 116.148 289.278 116.892 292.703C134.162 292.67 150.295 290.192 165.291 285.27C180.502 280.429 194.388 273.63 206.949 264.872C219.625 255.998 230.918 245.511 240.828 233.41C250.739 221.31 259.093 208.056 265.892 193.651C272.806 179.131 278.049 163.803 281.622 147.669C285.194 131.42 286.98 114.825 286.98 97.8837C286.98 85.0918 285.597 73.3945 282.832 62.7921C280.181 52.0746 276.436 42.9127 271.596 35.3066C266.872 27.5853 261.225 21.6503 254.657 17.5015C248.088 13.2375 240.886 11.1055 233.05 11.1055C227.864 11.1055 222.275 12.085 216.283 14.0442C210.406 16.0033 204.529 18.9996 198.652 23.0332C192.775 27.0667 187.128 32.1374 181.712 38.2454C176.411 44.3531 171.687 51.5561 167.538 59.8537C163.505 68.0358 160.221 77.3707 157.686 87.8577C155.266 98.2296 154.055 109.754 154.055 122.431C154.055 129.922 154.516 138.104 155.438 146.978C156.476 155.851 158.78 165.013 162.352 174.463C165.925 183.913 171.226 193.363 178.255 202.813ZM78.9147 287.977C80.6408 284.519 83.3257 281.623 86.6209 279.638C85.761 279.394 84.9036 279.139 84.0496 278.874C73.6787 275.647 64.5174 271.21 56.5659 265.563C48.6148 259.801 42.2767 253.059 37.5522 245.338C32.8274 237.501 30.4651 229.031 30.4651 219.927C30.4651 214.971 31.2717 210.361 32.8851 206.098C34.4984 201.834 36.9758 198.203 40.3179 195.207C43.7749 192.211 48.096 189.848 53.2818 188.12C58.4676 186.391 64.69 185.527 71.95 185.527C79.0947 185.527 86.9307 186.622 95.4581 188.811C103.986 191 112.744 194.631 121.732 199.701C130.72 204.772 139.766 211.399 148.87 219.581C157.974 227.763 166.674 237.79 174.971 249.66L182.404 244.473C174.913 233.871 166.731 224.248 157.858 215.605C148.985 206.962 139.421 199.586 129.165 193.478C119.024 187.371 108.307 182.645 97.0139 179.303C85.8359 175.961 74.1972 174.29 62.0973 174.29C55.6441 174.29 49.3638 175.097 43.2565 176.71C37.1488 178.209 31.6751 180.744 26.8352 184.317C22.1105 187.889 18.3077 192.614 15.4268 198.491C12.5459 204.369 11.1055 211.687 11.1055 220.445C11.1055 229.78 13.7559 238.827 19.0567 247.585C24.3576 256.229 31.6751 263.892 41.0093 270.576C50.3432 277.26 61.4634 282.619 74.3698 286.653C75.8691 287.121 77.3844 287.563 78.9147 287.977Z"
              fill="var(--brand)"
            />
          </g>
        </svg>
        <div className="absolute top-0 bottom-0 left-0 right-0 justify-center items-center flex">
          <Image
            src={"/phone.png"}
            alt={"phone"}
            className="object-cover w-[150px] h-[309px]"
            width={150}
            height={309}
            objectFit="cover"
          />
        </div>
      </div>
      <p className="text-center text-foreground-primary text-h2 font-medium tracking-wider leading-[32px]">
        Post a new spotlight
      </p>
      <p className="text-center text-foreground-secondary text-body font-normal tracking-wider leading-[20px]">
        Reach more audience and engage with creative <br />
        media spotlights linked to your products.
      </p>

      <div className="w-full mt-4 gap-4 flex flex-col">
        <SocialButton
          sub="Import from Instagram"
          text="instagram"
          action={() => { }}
        />
        <SocialButton
          sub="Import from Tiktok"
          text="tiktok"
          action={() => { }}
        />
        <SocialButton sub="Upload from gallery" text="upload" action={() => router.push('/sharespotlights')} />
      </div>
    </div>
  </button>
);
