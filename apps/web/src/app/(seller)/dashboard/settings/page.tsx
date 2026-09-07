"use client";
import Selling from "@/features/seller-dashboard/selling";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import IconButton from "@vibaar/ui/common/IconButton";
import { Menu } from "@vibaar/ui/icons";
import ModeSwitch from "@/design-system/common/ModeSwitch";

const Page = () => {
  return (
    <PageShell
      header={
        <Header
          title="Settings"
          trailing={<IconButton icon={Menu} label="Menu" />}
        />
      }>
      <Selling />
      <ModeSwitch />
    </PageShell>
  );
};

export default Page;
