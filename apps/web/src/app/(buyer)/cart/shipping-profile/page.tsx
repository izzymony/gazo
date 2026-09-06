/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useEffect } from "react";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@/design-system/common/Header";
import Button from "@vibaar/ui/common/Button";
import { useRouter } from "next/navigation";
import DropdownMenu from "@vibaar/ui/common/DropdownMenu";
import { CircleCheck, Plus } from "@vibaar/ui/icons";
import useShippingStore from "@/store/shippingStore";
import useAuthStore from "@/store/authStore";
import useOrderStore from "@/store/orderStore";
import { toast } from "sonner";
import Badge from "@vibaar/ui/common/Badge";

const Page = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    shippingDetails,
    setDefault,
    singleShippingDetails,
    fetchShippings,
    fetchGuestShippings,
    deleteShippingProfile,
    guestId,
  } = useShippingStore();
  const { clearCartShipping } = useOrderStore();

  // Switching to a different profile makes the current per-item shipping quotes
  // (made for the previous address) stale. Clear them so a stale amount can't be
  // charged; the buyer re-selects delivery per item at review, which re-quotes
  // against this address (P2 guard; seamless re-quote is design phase D).
  const handleSelectProfile = (profile: (typeof shippingDetails)[number]) => {
    if (profile.id === singleShippingDetails?.id) return;
    setDefault(profile);
    clearCartShipping();
    toast.message("Delivery address updated — re-select a delivery option for each item.");
  };

  // Load fresh profiles on mount — guest-aware (this screen is used in guest
  // checkout too, reached from review). Never touches guestId.
  useEffect(() => {
    if (user) {
      fetchShippings();
    } else if (guestId) {
      fetchGuestShippings(guestId);
    }
  }, [user, guestId, fetchShippings, fetchGuestShippings]);

  const handleEdit = (id: string) => {
    router.push(`/profile/shipping-address/edit?id=${id}`);
  };

  const handleSetAsDefault = (id: string) => {
    const profile = shippingDetails.find((p) => p.id === id);
    if (profile) {
      setDefault(profile);
      toast.success("Shipping profile set as default");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (shippingDetails.length <= 1) {
        toast.error("You must have at least one shipping profile");
        return;
      }
      await deleteShippingProfile(id);
      toast.success("Shipping profile deleted");
    } catch (error) {
      toast.error("Failed to delete shipping profile");
    }
  };

  return (
    <PageShell
      header={
        <Header
          showBack
          customText="Shipping profile"
          onBackClick={() => router.back()}
        />
      }
      footerAction={
        <Button onClick={() => router.push("/cart/complete-order/review")}>
          Continue
        </Button>
      }>
      <div className="w-full">
        <p className="font-medium text-h1">Select shipping profile</p>
        <p className="text-caption font-normal text-foreground-secondary">
          Your order will be sent to the shipping information you choose.
        </p>

        <div className="space-y-4 mt-8">
          {shippingDetails.map((profile) => (
            <div
              onClick={() => handleSelectProfile(profile)}
              key={profile.id}
              className={`border rounded-field p-2.5 relative ${
                profile.id === singleShippingDetails?.id
                  ? "border-brandDeep"
                  : "border-outline"
              }`}>
              <div className="flex justify-between">
                <div className="flex flex-col gap-1">
                  {profile.id === singleShippingDetails?.id && (
                    <Badge tone="brand" icon={<CircleCheck size={12} />}>
                      Default
                    </Badge>
                  )}
                  <p className="font-normal text-foreground-primary text-caption">
                    {profile.shipping_user.firstname +
                      " " +
                      profile.shipping_user.lastname}
                  </p>
                  <p className="text-caption font-normal text-foreground-primary">
                    {profile.shipping_user.phone}
                  </p>
                  {/* <p className="text-caption font-normal text-foreground-primary">
                    {""}
                  </p> */}
                  <p className="text-caption font-normal text-foreground-primary">
                    {profile.street}
                  </p>
                </div>
                <DropdownMenu
                  options={[
                    {
                      label: "Edit",
                      onClick: () => handleEdit(`${profile.id}`),
                    },
                    {
                      label: "Set as default",
                      onClick: () => handleSetAsDefault(`${profile.id}`),
                    },
                    {
                      label: "Delete",
                      onClick: () => handleDelete(`${profile.id}`),
                    },
                  ]}
                />
              </div>
            </div>
          ))}

          <button
            className="flex items-center gap-2 text-brandDeep text-body-sm font-medium mt-4"
            onClick={() => router.push("/cart/shipping-profile/new")}>
            <Plus size={18} />
            Add a new delivery address
          </button>
        </div>
      </div>
    </PageShell>
  );
};

export default Page;
