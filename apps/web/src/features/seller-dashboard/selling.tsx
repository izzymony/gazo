import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import useBusinessStore from "@/store/businessStore";
import useAuthStore from "@/store/authStore";
import StoreLogo from "@/design-system/common/StoreLogo";
import { useRewardsInfo } from "@/hooks/useRewardsInfo";
import { toast } from "sonner";
import {
  ChevronRight,
  Store,
  StoreLocation,
  Bank,
  VerifiedBadge,
  DeliveryTruck,
  Shield,
  Invoice,
  Bell,
  HelpSquare,
  BubbleChat,
  Book,
  PrivacyLock,
  LegalDoc,
  Logout,
  Gift,
  FaStar,
} from "@/design-system/icons";

const Sellercard = ({
  text,
  action,
  icon,
}: {
  text: string;
  action: () => void;
  icon: ReactNode;
}) => (
  <div
    onClick={action}
    className="flex justify-between items-center cursor-pointer">
    <div className="flex gap-2 text-body font-normal items-center text-ink-90">
      {icon}
      <p>{text}</p>
    </div>
    <ChevronRight size={20} className="text-ink-40" />
  </div>
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

    // pb clears the fixed ModeSwitch pill (bottom-[72px]) so the Log out row is reachable on mobile
  return (
    <div className="w-full space-y-6 pb-24 lg:pb-6">
      {store?.id && (
        <div className="flex justify-between items-center py-2">
          <div className="flex gap-2 items-center">
            <StoreLogo
              src={typeof store?.logo === "string" ? store.logo : undefined}
              storeName={store?.name || "Store"}
              size={36}
              className="ring-1 ring-ink-10"
            />
            <div className="flex flex-col">
              <p className="text-body font-medium">{store?.name + ""}</p>
              <p className="text-ink-40 font-normal text-body">
                {store?.category + ""}
              </p>
            </div>
          </div>
          <div
            className="text-instaRed flex gap-1 items-center cursor-pointer"
            onClick={() => router.push(`/dashboard/storefront`)}>
            View store
            <ChevronRight size={20} />
          </div>
        </div>
      )}

      {/* Rewards access card */}
      <div
        onClick={() => router.push("/profile/referrals")}
        className="cursor-pointer overflow-hidden">
        <div className="relative bg-gradient-to-r from-instaRed to-instaRed/70 rounded-card p-4 text-white shadow-card">
          {/* Decorative sparkle */}
          <div className="absolute top-2 right-3 opacity-30">
            <FaStar size={16} className="text-white" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Gift size={20} className="text-white" />
              </div>
              <div>
                <p className="text-white/80 text-caption font-normal uppercase tracking-wide">
                  Available Earnings
                </p>
                <p className="text-white text-body-lg font-semibold">
                  ₦{creditBalance.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/70 text-body-sm">Earn rewards</span>
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <ChevronRight size={14} className="text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-4 text-ink-90 font-medium text-body">Menu</p>
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
                className={store?.is_verified ? "text-info" : undefined}
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

          {/* Coming soon */}
          <div className="pt-3">
            <p className="text-body-sm text-ink-40">Coming soon</p>
          </div>
          <Sellercard
            text="Billing"
            action={() => toast("Billing coming soon", { icon: "🔜" })}
            icon={<Invoice size={20} />}
          />
          <Sellercard
            text="Notifications settings"
            action={() =>
              toast("Notification settings coming soon", { icon: "🔜" })
            }
            icon={<Bell size={20} />}
          />
          <Sellercard
            text="FAQs"
            action={() => toast("FAQs coming soon", { icon: "🔜" })}
            icon={<HelpSquare size={20} />}
          />
          <Sellercard
            text="Contact Us"
            action={() => toast("Contact Us coming soon", { icon: "🔜" })}
            icon={<BubbleChat size={20} />}
          />
          <Sellercard
            text="Visit our blog"
            action={() => toast("Blog coming soon", { icon: "🔜" })}
            icon={<Book size={20} />}
          />
          <Sellercard
            text="Privacy Policy"
            action={() => toast("Privacy Policy coming soon", { icon: "🔜" })}
            icon={<PrivacyLock size={20} />}
          />
          <Sellercard
            text="Terms of service"
            action={() => toast("Terms of Service coming soon", { icon: "🔜" })}
            icon={<LegalDoc size={20} />}
          />

          {/* Log out - always at the bottom */}
          <div
            className="flex gap-2 text-body font-normal items-center cursor-pointer text-instaRed"
            onClick={() => logout(() => router.push("/signin"))}>
            <Logout size={20} />
            <p>Log out</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Selling;
