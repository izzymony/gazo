"use client";
import React from "react";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import Surface from "@vibaar/ui/common/Surface";
import Section from "@vibaar/ui/common/Section";
import {
  ChevronRight,
  BubbleChat,
  Globe,
} from "@vibaar/ui/icons";
import { useRouter } from "next/navigation";
import { supportWhatsAppUrl } from "@/lib/support";

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
        {/* The FAQs row used to route to /dashboard/settings/change-password —
            a SELLER route, from the buyer side, labelled FAQs. No FAQ exists, so
            the row is gone rather than sent somewhere wrong. */}
        <Surface
          className="flex justify-between items-center"
          onClick={() => window.open(supportWhatsAppUrl(), "_blank", "noopener")}
          ariaLabel="Contact us on WhatsApp">
          <div className="flex gap-2 items-center">
            <BubbleChat size={20} className="text-foreground-primary" />
            <p className="text-foreground-secondary text-body">Contact us on WhatsApp</p>
          </div>
          <ChevronRight size={20} className="text-foreground-primary" />
        </Surface>
        <Surface
          className="flex justify-between items-center"
          onClick={() => router.push("/")}
          ariaLabel="Visit our website">
          <div className="flex gap-2 items-center">
            <Globe size={20} className="text-foreground-primary" />
            <p className="text-foreground-secondary text-body">Visit our website</p>
          </div>
          <ChevronRight size={20} className="text-foreground-primary" />
        </Surface>
      </Section>
    </PageShell>
  );
};

export default Security;
