"use client";
import React from "react";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import Surface from "@vibaar/ui/common/Surface";
import Section from "@vibaar/ui/common/Section";
import {
  ChevronRight,
  HelpSquare,
  BubbleChat,
  Book,
  Globe,
} from "@vibaar/ui/icons";
import { useRouter } from "next/navigation";

const Security = () => {
  const router = useRouter();
  return (
    <PageShell
      header={
        <Header
          onBack={() => router.back()}
          title="Help & support"
        />
      }>
      <Section>
        <Surface
          className="flex justify-between items-center"
          onClick={() => router.push(`/dashboard/settings/change-password`)}>
          <div className="flex gap-2 items-center cursor-pointer">
            <HelpSquare size={20} className="text-foreground-primary" />
            <p className="text-foreground-secondary text-body">FAQs</p>
          </div>
          <ChevronRight size={20} className="text-foreground-primary" />
        </Surface>
        <Surface className="flex justify-between items-center">
          <div className="flex gap-2 items-center cursor-pointer">
            <BubbleChat size={20} className="text-foreground-primary" />
            <p className="text-foreground-secondary text-body">Contact Us</p>
          </div>
          <ChevronRight size={20} className="text-foreground-primary" />
        </Surface>
        <Surface className="flex justify-between items-center">
          <div className="flex gap-2 items-center cursor-pointer">
            <Book size={20} className="text-foreground-primary" />
            <p className="text-foreground-secondary text-body">Visit our blog</p>
          </div>
          <ChevronRight size={20} className="text-foreground-primary" />
        </Surface>
        <Surface className="flex justify-between items-center">
          <div className="flex gap-2 items-center cursor-pointer">
            <Globe size={20} className="text-foreground-primary" />
            <p className="text-foreground-secondary text-body">Visit our Website</p>
          </div>
          <ChevronRight size={20} className="text-foreground-primary" />
        </Surface>
      </Section>
    </PageShell>
  );
};

export default Security;
