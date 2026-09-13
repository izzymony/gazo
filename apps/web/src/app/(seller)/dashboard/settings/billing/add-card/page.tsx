"use client";

import React from "react";
import { useRouter } from "next/navigation";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import Button from "@vibaar/ui/common/Button";
import Section from "@vibaar/ui/common/Section";
import { AddCardFields, useAddCardForm } from "@/features/billing/addCard";

/**
 * The canonical add-card screen, and the direct-URL / hard-refresh fallback for
 * the dialog the billing row intercepts to. Its desktop action comes from the
 * shell's constrained inline-right fallback, never the old fixed footer.
 *
 * Submission is broken and stays broken — see the note in features/billing/addCard.
 */
const Page = () => {
  const router = useRouter();
  const formik = useAddCardForm();

  return (
    <PageShell
      header={
        <Header
          onBack={() => router.back()}
          title="Add new card"
        />
      }
      footerAction={
        <Button type="submit" onClick={() => router.push("")}>
          Save Card
        </Button>
      }>
      <Section title="Enter your card details">
        <AddCardFields formik={formik} />
      </Section>
    </PageShell>
  );
};

export default Page;
