/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import useBusinessStore from "@/store/businessStore";
import PayoutView from "./view";
import { useEffect } from "react";

export default function Page() {
  const { getBankAccounts } = useBusinessStore();

  useEffect(() => {
    getBankAccounts();
    return () => {
      getBankAccounts();
    };
  }, []);

  return <PayoutView />;
}
