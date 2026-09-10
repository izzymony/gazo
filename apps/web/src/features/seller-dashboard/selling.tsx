import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import useBusinessStore from "@/store/businessStore";
import useAuthStore from "@/store/authStore";
import StoreLogo from "@vibaar/ui/common/StoreLogo";
import { useRewardsInfo } from "@/hooks/useRewardsInfo";
import {
  ChevronRight,
  Store,
  StoreLocation,
  Bank,
  VerifiedBadge,
  DeliveryTruck,
  Shield,
  Invoice,
  BubbleChat,
  PrivacyLock,
  LegalDoc,
  Logout,
} from "@vibaar/ui/icons";
import { supportWhatsAppUrl } from "@/lib/support";
import Link from "next/link";
import ListItem from "@vibaar/ui/common/ListItem";
import EarningsCard from "@/features/wallet/EarningsCard";

const Sellercard = ({
  text,
  action,
  icon,
}: {
  text: string;
  action: () => void;
  icon: ReactNode;
}) => (
  <button type="button"
    onClick={action}
    className="text-left w-full flex justify-between items-center cursor-pointer">
    <div className="flex gap-2 text-body font-normal items-center text-foreground-primary">
      {icon}
      <p>{text}</p>
    </div>
    <ChevronRight size={20} className="text-foreground-muted" />
  </button>
);

const Selling = () => {
  const router = useRouter();
  const { store } = useBusinessStore();
  const { logout, user } = useAuthStore();
  // W2.5: shared cached query — dedupes with buying + referrals into one request.
  const { data: rewardsInfo } = useRewardsInfo(!!user?.id);

  // Use fresh rewards info if available, otherwise fallback to user object
  const creditBalance = rewardsInfo
    ? rewardsInfo.total_credit
    : (user?.shopping_credit || 0) + (user?.withdrawable_credit || 0);

    // pb clears the fixed ModeSwitch pill (bottom-20 + 44px) so Log out stays reachable on mobile
  return (
    <div className="w-full space-y-6 pb-24 lg:pb-6">
      {store?.id && (
        // ListItem, not a fourth hand-rolled copy of [avatar][name/sub][action].
        // The hand-rolled one gave the name and the category the SAME size
        // (`text-body` twice), so the row read flat with no primary line, and
        // the buyer tab's copy of it used a different avatar size again.
        <ListItem
          leading={
            <StoreLogo
              src={typeof store?.logo === "string" ? store.logo : undefined}
              storeName={store?.name || "Store"}
              size={40}
              className="ring-1 ring-outline"
            />
          }
          title={store?.name ?? ""}
          subtitle={store?.category ?? ""}
          trailing={
            <Link
              href="/dashboard/storefront"
              className="flex items-center gap-1 text-body-sm font-medium text-brandDeep underline-offset-4 hover:underline">
              View store
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          }
        />
      )}

      <EarningsCard amount={creditBalance} />

      <div>
        <p className="mb-4 text-foreground-primary font-medium text-body">Menu</p>
        <div className="space-y-5">
          <Sellercard
            text="Store details"
            action={() => router.push(`/dashboard/storefront/details`)}
            icon={<Store size={20} />}
          />
          <Sellercard
            text="Store Address"
            action={() => router.push(`/dashboard/storefront/address`)}
            icon={<StoreLocation size={20} />}
          />
          <Sellercard
            text="Manage Payout Accounts"
            action={() => router.push("/dashboard/payouts")}
            icon={<Bank size={20} />}
          />
          <Sellercard
            text={store?.is_verified ? "Verified" : "Get verified"}
            action={() => router.push("/verify")}
            icon={
              <VerifiedBadge
                size={20}
                className={store?.is_verified ? "text-info-foreground" : undefined}
              />
            }
          />
          <Sellercard
            text="Shipping methods"
            action={() => router.push(`/dashboard/storefront/shipping`)}
            icon={<DeliveryTruck size={20} />}
          />
          <Sellercard
            text="Security"
            action={() => router.push(`/dashboard/settings/security`)}
            icon={<Shield size={20} />}
          />

          <Sellercard
            text="Billing"
            action={() => router.push(`/dashboard/settings/billing`)}
            icon={<Invoice size={20} />}
          />
          <Sellercard
            text="Contact Us"
            action={() => window.open(supportWhatsAppUrl(), "_blank", "noopener")}
            icon={<BubbleChat size={20} />}
          />
          <Sellercard
            text="Privacy Policy"
            action={() => router.push(`/privacy`)}
            icon={<PrivacyLock size={20} />}
          />
          <Sellercard
            text="Terms of service"
            action={() => router.push(`/terms`)}
            icon={<LegalDoc size={20} />}
          />

          {/* Log out - always at the bottom */}
          <button type="button"
            className="text-left flex gap-2 text-body font-normal items-center cursor-pointer text-brandDeep"
            onClick={() => logout(() => router.push("/signin"))}>
            <Logout size={20} />
            <p>Log out</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Selling;
