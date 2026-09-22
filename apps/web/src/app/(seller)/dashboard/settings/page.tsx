"use client";
import Selling from "@/features/seller-dashboard/selling";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import ModeSwitch from "@/design-system/common/ModeSwitch";

const Page = () => {
  return (
    <PageShell
      header={
        <Header
          title="Settings"
        />
      }>
      <Selling />
      <ModeSwitch />
    </PageShell>
  );
};

export default Page;
