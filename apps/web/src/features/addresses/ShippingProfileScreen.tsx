/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useEffect } from "react";
import AddressFlowFrame from "./AddressFlowFrame";
import Button from "@vibaar/ui/common/Button";
import { useRouter } from "next/navigation";
import DropdownMenu from "@vibaar/ui/common/DropdownMenu";
import { CircleCheck, Plus } from "@vibaar/ui/icons";
import useShippingStore from "@/store/shippingStore";
import useAuthStore from "@/store/authStore";
import useOrderStore from "@/store/orderStore";
import { toast } from "sonner";
import Badge from "@vibaar/ui/common/Badge";

/**
 * Choosing which saved shipping profile an order goes to — dialog family 5.
 *
 * One screen, two presentations. As the canonical route it is a page; reached by
 * a soft navigation from the review screen, the cart or an order it is the same
 * screen inside a dialog. `AddressFlowFrame` supplies whichever chrome applies,
 * so the quote-clearing logic below exists once.
 */
const ShippingProfileScreen = ({ dialog = false }: { dialog?: boolean }) => {
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
    <AddressFlowFrame
      dialog={dialog}
      title="Shipping profile"
      action={
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
              key={profile.id}
              className={`border rounded-field p-2.5 relative ${
                profile.id === singleShippingDetails?.id
                  ? "border-brandDeep"
                  : "border-outline"
              }`}>
              <div className="flex justify-between">
                {/* The SELECTABLE part is a real button, and the row around it
                    is not. It was a `div onClick` wrapping the whole card —
                    not focusable, no role, and ignoring Enter and Space, so
                    changing delivery address was mouse-only. It cannot be the
                    whole card either: the card also holds a dropdown, and a
                    button inside a button is invalid. */}
                <button
                  type="button"
                  onClick={() => handleSelectProfile(profile)}
                  aria-pressed={profile.id === singleShippingDetails?.id}
                  className="flex flex-col gap-1 text-left">
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
                </button>
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

          <Button
            variant="link"
            size="sm"
            fullWidth={false}
            className="mt-4"
            onClick={() => router.push("/cart/shipping-profile/new")}>
            <Plus size={18} />
            Add a new delivery address
          </Button>
        </div>
      </div>
    </AddressFlowFrame>
  );
};

export default ShippingProfileScreen;
