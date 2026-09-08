"use client";
import React from "react";

import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
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
          onBack={() => router.back()}
          title="Settings"
        />
      }>
      <Section>
        <Surface
          className="flex justify-between items-center"
          onClick={() => router.push(`/profile/settings/change-password`)}>
          <div className="flex gap-3 items-center cursor-pointer">
            <CiLock size={20} className="text-foreground-primary" />
            <p className="text-foreground-secondary text-body">Change password</p>
          </div>
          <ChevronRight size={20} className="text-foreground-primary" />
        </Surface>
        <Surface
          className="flex justify-between items-center"
          onClick={() => router.push("/notification")}>
          <div className="flex gap-3 items-center">
            <Bell size={20} className="text-foreground-primary" />
            <p className="text-foreground-secondary text-body">Notifications</p>
          </div>
          <ChevronRight size={20} className="text-foreground-primary" />
        </Surface>
      </Section>
    </PageShell>
  );
};

export default Security;
