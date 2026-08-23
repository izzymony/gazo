"use client";
import React, { useEffect } from "react";
import PageShell from "@/design-system/PageShell";
import Header from "@/design-system/common/Header";
import Button from "@/design-system/common/Button";
import Card from "@/design-system/common/Card";
import Section from "@/design-system/common/Section";
import { CircleCheck } from "@/design-system/icons";
import { useRouter } from "next/navigation";
import DropdownMenu from "@/design-system/common/DropdownMenu";
import useAuthStore from "@/store/authStore";
import useShippingStore from "@/store/shippingStore";
import { toast } from "sonner";

const Page = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const { 
    shippingDetails, 
    setDefault, 
    singleShippingDetails, 
    fetchShippings, 
    deleteShippingProfile 
  } = useShippingStore();

  useEffect(() => {
    if (user) {
      fetchShippings();
    }
  }, [user, fetchShippings]);

  const handleEdit = (id: string) => {
    // Navigate to edit page with shipping profile ID
    router.push(`/profile/shipping-address/edit?id=${id}`);
  };

  const handleSetAsDefault = async (id: string) => {
    try {
      const profile = shippingDetails.find(p => p.id === id);
      if (profile) {
        setDefault(profile);
        toast.success("Shipping profile set as default");
      }
    } catch (error) {
      toast.error("Failed to set as default");
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

  const Send = () => {
    router.push("/cart/shipping-profile/new?from=profile");
  };
  return (
    <PageShell
      header={
        <Header
          showBack
          onBackClick={() => router.back()}
          customText="My Shipping profiles"
        />
      }
      footerAction={
        <Button type="submit" onClick={Send}>
          Add new Shipping profile
        </Button>
      }>
      <div className="space-y-1">
        <p className="font-medium text-h1">Select shipping profile</p>
        <p className="text-caption font-normal text-ink-60">
          Your order will be sent to the shipping information you choose.
        </p>
      </div>

      <Section>
        {shippingDetails.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-ink-60 text-body">No shipping profiles found</p>
            <p className="text-ink-60 text-body-sm">Add your first shipping profile to get started</p>
          </div>
        ) : (
          shippingDetails.map((profile) => (
            <Card
              key={profile.id}
              className={`relative ${
                profile.id === singleShippingDetails?.id
                  ? "border-brand"
                  : "border-ink-10"
              }`}>
              <div className="flex justify-between">
                <div className="flex flex-col gap-1">
                  {profile.id === singleShippingDetails?.id && (
                    <span className=" flex flex-row items-center w-[max-content] gap-1  bg-brand/10 text-brand text-caption px-2 rounded-pill border border-brand tracking-[0.5px]">
                      Default{" "}
                      <CircleCheck size={12} className="text-brand" />
                    </span>
                  )}
                  <p className="font-normal text-ink-90 text-caption">
                    {profile.shipping_user.firstname +
                      " " +
                      profile.shipping_user.lastname}
                  </p>
                  <p className="text-caption font-normal text-ink-90">
                    {profile.shipping_user.phone}
                  </p>
                  <p className="text-caption font-normal text-ink-90">
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
            </Card>
          ))
        )}
      </Section>
    </PageShell>
  );
};

export default Page;