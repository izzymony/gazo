"use client";

import React from "react";
import { useRouter } from "next/navigation";
import ResponsiveRouteDialog from "@vibaar/ui/common/ResponsiveRouteDialog";
import PageActionButton from "@vibaar/ui/common/PageActionButton";
import LocationModal from "@/hooks/locationmodal";
import {
  EditShippingProfileFields,
  useEditShippingProfile,
} from "./editShippingProfile";

/**
 * Dialog family 6 — editing a saved shipping profile.
 *
 * THE LOCATION PICKER IS A STEP, NOT A SECOND DIALOG. On the full page it is a
 * bottom sheet, which is fine because nothing is above it; inside a panel that
 * would be a dialog over a dialog — two focus traps, two Escape handlers, a
 * backdrop over a backdrop. The picker renders `inline` here, swapping the
 * panel's body, and the dialog's own title and footer follow the step. It is the
 * same picker component either way, not a second implementation.
 */
export default function EditShippingProfileDialog() {
  const router = useRouter();
  const m = useEditShippingProfile(() => router.back());

  if (!m.profileToEdit) return null;

  const picking = m.isLocationOpen;

  return (
    <ResponsiveRouteDialog
      title={picking ? "Choose a location" : "Edit shipping profile"}
      onClose={() => (picking ? m.setIsLocationOpen(false) : router.back())}
      footer={
        picking ? undefined : (
          <PageActionButton type="button" onClick={m.submit} loading={m.isLoading}>
            Update shipping profile
          </PageActionButton>
        )
      }>
      {picking ? (
        <LocationModal
          inline
          isLocationModalOpen
          closeLocationModal={() => m.setIsLocationOpen(false)}
          setLoading={m.setLoading}
          setLocation={m.setLocation}
          location={m.location}
          setAddress={(address: string) => {
            m.onAddressPicked(address);
            m.setIsLocationOpen(false);
          }}
        />
      ) : (
        <div className="space-y-4">
          <p className="text-body font-normal text-foreground-secondary">
            Your order and delivery updates will be sent to the contact
            information below.
          </p>
          <EditShippingProfileFields machine={m} />
        </div>
      )}
    </ResponsiveRouteDialog>
  );
}
