/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React from "react";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import Button from "@vibaar/ui/common/Button";
import Section from "@vibaar/ui/common/Section";
import { useRouter } from "next/navigation";
import LocationModal from "@/hooks/locationmodal";
import {
  EditShippingProfileFields,
  useEditShippingProfile,
} from "@/features/addresses/editShippingProfile";

/**
 * The canonical edit-shipping-profile screen, and the direct-URL / hard-refresh
 * fallback for the dialog the shipping-address list intercepts to. Same seven
 * questions, same update call — both come from the shared machine.
 *
 * Here the location picker stays the bottom sheet it has always been: nothing is
 * above it on a full page, so there is nothing to nest inside.
 */
const Page = () => {
  const router = useRouter();
  const m = useEditShippingProfile();

  if (!m.profileToEdit) return null;

  return (
    <PageShell
      header={
        <Header
          onBack={() => router.back()}
          title="Edit shipping profile"
        />
      }
      footerAction={
        <Button type="button" onClick={m.submit} loading={m.isLoading}>
          Update shipping profile
        </Button>
      }>
      <div className="space-y-1">
        <p className="font-medium text-h1">Edit shipping profile</p>
        <p className="text-body font-normal text-foreground-secondary">
          Your order and delivery updates will be sent to the contact
          information below.
        </p>
      </div>

      <Section className="space-y-4">
        <EditShippingProfileFields machine={m} />
      </Section>

      <LocationModal
        isLocationModalOpen={m.isLocationOpen}
        closeLocationModal={() => m.setIsLocationOpen(false)}
        setLoading={m.setLoading}
        setLocation={m.setLocation}
        location={m.location}
        setAddress={m.onAddressPicked}
      />
    </PageShell>
  );
};

export default Page;
