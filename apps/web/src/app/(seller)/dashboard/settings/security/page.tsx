"use client";
import React from "react";
import { IoIosArrowForward, CiLock, LockPassword } from "@vibaar/ui/icons";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@/design-system/common/Header";
import Button from "@vibaar/ui/common/Button";
import Surface from "@vibaar/ui/common/Surface";
import Section from "@vibaar/ui/common/Section";
import { useRouter } from "next/navigation";

const Security = () => {
  const router = useRouter();
  return (
    <PageShell
      header={
        <Header showBack onBackClick={() => router.back()} customText="Security" />
      }
      footerAction={
        <Button type="submit" onClick={() => {}}>
          Save
        </Button>
      }>
      {/* content only — shell owns the mt-11/px-4 lg:px-5 offset+padding */}
      <Section>
        <Surface className="flex justify-between items-center">
          <div
            className="flex gap-2 items-center cursor-pointer"
            onClick={() => router.push(`/dashboard/settings/change-password`)}>
            <LockPassword size={20} className="text-ink-90" />
            <p className="text-ink-60 text-body">Change Password</p>
          </div>
          <IoIosArrowForward />
        </Surface>
        <Surface className="flex justify-between items-center">
          <div className="flex gap-2 items-center cursor-pointer">
            <CiLock />
            <p className="text-ink-60 text-body">2 step authentication</p>
          </div>
          <IoIosArrowForward />
        </Surface>
      </Section>
    </PageShell>
  );
};

export default Security;
