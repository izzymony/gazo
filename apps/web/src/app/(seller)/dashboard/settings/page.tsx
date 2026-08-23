"use client";
import Selling from "@/features/seller-dashboard/selling";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@/design-system/common/Header";
import ModeSwitch from "@/design-system/common/ModeSwitch";

const Page = () => {
  return (
    <PageShell
      header={
        <Header
          showMenu
          isMenu
          customText="Settings"
        />
      }>
      <Selling />
      <ModeSwitch />
    </PageShell>
  );
};

export default Page;
