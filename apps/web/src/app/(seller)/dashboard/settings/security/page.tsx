"use client";
import React from "react";
import { IoIosArrowForward, CiLock, LockPassword } from "@/design-system/icons";
import PageShell from "@/design-system/PageShell";
import Header from "@/design-system/common/Header";
import Button from "@/design-system/common/Button";
import Card from "@/design-system/common/Card";
import Section from "@/design-system/common/Section";
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
        <Card className="flex justify-between items-center">
          <div
            className="flex gap-2 items-center cursor-pointer"
            onClick={() => router.push(`/dashboard/settings/change-password`)}>
            <LockPassword size={20} className="text-ink-90" />
            <p className="text-ink-60 text-body">Change Password</p>
          </div>
          <IoIosArrowForward />
        </Card>
        <Card className="flex justify-between items-center">
          <div className="flex gap-2 items-center cursor-pointer">
            <CiLock />
            <p className="text-ink-60 text-body">2 step authentication</p>
          </div>
          <IoIosArrowForward />
        </Card>
      </Section>
    </PageShell>
  );
};

export default Security;
