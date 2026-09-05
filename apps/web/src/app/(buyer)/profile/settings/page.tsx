"use client";
import React from "react";

import PageShell from "@vibaar/ui/PageShell";
import Header from "@/design-system/common/Header";
import Surface from "@vibaar/ui/common/Surface";
import Section from "@vibaar/ui/common/Section";
import { ChevronRight, CiLock, Bell } from "@vibaar/ui/icons";
import { useRouter } from "next/navigation";

const Security = () => {
  const router = useRouter();
  return (
    <PageShell
      header={
        <Header
          showBack
          onBackClick={() => router.back()}
          customText="Settings"
        />
      }>
      <Section>
        <Surface
          className="flex justify-between items-center"
          onClick={() => router.push(`/profile/settings/change-password`)}>
          <div className="flex gap-3 items-center cursor-pointer">
            <CiLock size={20} className="text-ink-90" />
            <p className="text-ink-60 text-body">Change password</p>
          </div>
          <ChevronRight size={20} className="text-ink-90" />
        </Surface>
        <Surface className="flex justify-between items-center">
          <div className="flex gap-3 items-center cursor-pointer">
            <Bell size={20} className="text-ink-90" />
            <p className="text-ink-60 text-body">Notifications</p>
          </div>
          <ChevronRight size={20} className="text-ink-90" />
        </Surface>
      </Section>
    </PageShell>
  );
};

export default Security;
