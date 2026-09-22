"use client";
import React, { useEffect } from "react";
import PageShell from "@vibaar/ui/PageShell";
import PageActionButton from "@vibaar/ui/common/PageActionButton";
import Surface from "@vibaar/ui/common/Surface";
import Section from "@vibaar/ui/common/Section";
import { CircleCheck } from "@vibaar/ui/icons";
import { useRouter } from "next/navigation";
import DropdownMenu from "@vibaar/ui/common/DropdownMenu";
import useAuthStore from "@/store/authStore";
import useShippingStore from "@/store/shippingStore";
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
      pageHeader={{
        onBack: () => router.back(),
        title: "My Shipping profiles",
        actions: (
          <PageActionButton type="submit" onClick={Send}>
            Add new Shipping profile
          </PageActionButton>
        ),
      }}>
      <div className="space-y-1">
        <p className="font-medium text-h1">Select shipping profile</p>
        <p className="text-caption font-normal text-foreground-secondary">
          Your order will be sent to the shipping information you choose.
        </p>
      </div>

      <Section>
        {shippingDetails.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-foreground-secondary text-body">No shipping profiles found</p>
            <p className="text-foreground-secondary text-body-sm">Add your first shipping profile to get started</p>
          </div>
        ) : (
          shippingDetails.map((profile) => (
            <Surface
              key={profile.id}
              className={`relative ${
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
            </Surface>
          ))
        )}
      </Section>
    </PageShell>
  );
};

export default Page;