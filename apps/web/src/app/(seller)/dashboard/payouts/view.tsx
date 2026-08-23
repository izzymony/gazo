/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import EmptyState from "@/design-system/common/EmptyState";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@/design-system/common/Header";
import Section from "@/design-system/common/Section";
import Button from "@/design-system/common/Button";
import useBusinessStore from "@/store/businessStore";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Bank, BsThreeDots } from "@/design-system/icons";

const AccountCard = ({
  accountname,
  accountnumber,
  bankname,
  defaults,
  show,
  id,
  setShow,
  onDelete,
  onSetDefault,
}: {
  defaults: boolean;
  accountnumber: string;
  bankname: string;
  accountname: string;
  show: string;
  id: string;
  setShow: (val: string) => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) => {
  return (
    <div className="relative justify-between items-center flex gap-4 border border-ink-10 rounded-card py-3 px-2">
      <div className="w-10 h-10 rounded-field bg-white border border-ink-10 flex items-center justify-center shrink-0">
        <Bank size={22} className="text-ink-90" />
      </div>
      <div className="flex-1">
        <div className="flex gap-2 items-center">
          <p className="text-body text-ink-90 font-medium">
            {`${bankname}-Ending in ${accountnumber.slice(-4)}`}
          </p>
          {defaults && (
            <span className="rounded-pill bg-brand/10 text-brand text-caption font-medium px-2 py-0.5">
              Default
            </span>
          )}
        </div>
        <p className="text-body text-ink-60 font-normal">
          {accountname}
        </p>
      </div>
      <div
        data-dropdown-trigger
        className={`w-9 h-9 flex items-center justify-center cursor-pointer ${show === id ? "bg-ink-20 rounded-full " : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          setShow(show === id ? "" : id);
        }}>
        <BsThreeDots
          size={20}
          className={show === id ? "text-brand" : "text-ink-90"}
        />
      </div>
      {show === id && (
        <div data-dropdown-menu className="absolute rounded-field bg-white right-3 -bottom-20 border p-3 gap-3 flex flex-col shadow-md z-10">
          {!defaults && (
            <p
              className="text-body text-ink-60 font-medium cursor-pointer hover:text-ink-90"
              onClick={(e) => {
                e.stopPropagation();
                onSetDefault();
                setShow("");
              }}>
              Set as default
            </p>
          )}
          <p
            className="text-body text-brand font-medium cursor-pointer hover:opacity-80"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              setShow("");
            }}>
            Delete
          </p>
        </div>
      )}
    </div>
  );
};

export default function PayoutView() {
  const router = useRouter();
  const { bankAccounts, deleteBankAccount, setDefaultBankAccount } = useBusinessStore();
  const [show, setShow] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (show) {
        const target = event.target as Element;
        // Check if click is outside the dropdown menu area
        if (!target.closest('[data-dropdown-menu]') && !target.closest('[data-dropdown-trigger]')) {
          setShow("");
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [show]);

  const handleDelete = async (bankId: string) => {
    if (confirm("Are you sure you want to delete this bank account?")) {
      await deleteBankAccount(bankId);
    }
  };

  const handleSetDefault = async (bankId: string) => {
    await setDefaultBankAccount(bankId);
  };

  return (
    <PageShell
      header={
        <Header
          showBack
          onBackClick={() => router.back()}
          customText="Payout Accounts"
        />
      }
      footerAction={
        <Button onClick={() => router.push("/dashboard/payouts/addaccount")}>Add account</Button>
      }>
      <Section>
        {bankAccounts.length > 0 ? (
          bankAccounts.map((it, index) => (
            <AccountCard
              key={it.id || index}
              defaults={it.is_default}
              accountnumber={it.account_number}
              bankname={it.bank.slice(0, 3)}
              accountname={it.account_name}
              id={it.id}
              setShow={setShow}
              show={show}
              onDelete={() => handleDelete(it.id)}
              onSetDefault={() => handleSetDefault(it.id)}
            />
          ))
        ) : (
          <EmptyState
            image="/images/emptystate/activity_empty_state.svg"
            title="No accounts added yet."
            subtitle="Any accounts added on your wallet will appear here."
          />
        )}
      </Section>
    </PageShell>
  );
}
