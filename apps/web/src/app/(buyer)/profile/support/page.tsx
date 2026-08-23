"use client";
import React from "react";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@/design-system/common/Header";
import Card from "@/design-system/common/Card";
import Section from "@/design-system/common/Section";
import {
  ChevronRight,
  HelpSquare,
  BubbleChat,
  Book,
  Globe,
} from "@/design-system/icons";
import { useRouter } from "next/navigation";

const Security = () => {
  const router = useRouter();
  return (
    <PageShell
      header={
        <Header
          showBack
          onBackClick={() => router.back()}
          customText="Help & support"
        />
      }>
      <Section>
        <Card
          className="flex justify-between items-center"
          onClick={() => router.push(`/dashboard/settings/change-password`)}>
          <div className="flex gap-2 items-center cursor-pointer">
            <HelpSquare size={20} className="text-ink-90" />
            <p className="text-ink-60 text-body">FAQs</p>
          </div>
          <ChevronRight size={20} className="text-ink-90" />
        </Card>
        <Card className="flex justify-between items-center">
          <div className="flex gap-2 items-center cursor-pointer">
            <BubbleChat size={20} className="text-ink-90" />
            <p className="text-ink-60 text-body">Contact Us</p>
          </div>
          <ChevronRight size={20} className="text-ink-90" />
        </Card>
        <Card className="flex justify-between items-center">
          <div className="flex gap-2 items-center cursor-pointer">
            <Book size={20} className="text-ink-90" />
            <p className="text-ink-60 text-body">Visit our blog</p>
          </div>
          <ChevronRight size={20} className="text-ink-90" />
        </Card>
        <Card className="flex justify-between items-center">
          <div className="flex gap-2 items-center cursor-pointer">
            <Globe size={20} className="text-ink-90" />
            <p className="text-ink-60 text-body">Visit our Website</p>
          </div>
          <ChevronRight size={20} className="text-ink-90" />
        </Card>
      </Section>
    </PageShell>
  );
};

export default Security;
