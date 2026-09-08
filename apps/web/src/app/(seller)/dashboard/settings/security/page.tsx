"use client";
import React from "react";
import { IoIosArrowForward, LockPassword } from "@vibaar/ui/icons";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import Surface from "@vibaar/ui/common/Surface";
import Section from "@vibaar/ui/common/Section";
import { useRouter } from "next/navigation";

const Security = () => {
  const router = useRouter();
  return (
    <PageShell
      header={
        <Header
          onBack={() => router.back()}
          title="Security"
        />
      }>
      {/* content only — shell owns the mt-11/px-4 lg:px-5 offset+padding */}
      <Section>
        <Surface
          className="flex justify-between items-center"
          onClick={() => router.push(`/dashboard/settings/change-password`)}>
          <div className="flex gap-2 items-center">
            <LockPassword size={20} className="text-foreground-primary" />
            <p className="text-foreground-secondary text-body">Change Password</p>
          </div>
          <IoIosArrowForward />
        </Surface>
      </Section>
    </PageShell>
  );
};

export default Security;
