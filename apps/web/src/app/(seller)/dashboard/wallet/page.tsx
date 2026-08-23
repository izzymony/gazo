"use client";

import { useRouter } from "next/navigation";
import WalletBody from "@/features/seller-shell/walletbody";

// The real wallet page: renders the balance/transactions body as its own route.
// Class B (nav hidden by dashboard/layout.tsx). Settings live at ./settings.
export default function Page() {
  const router = useRouter();
  return <WalletBody action={() => router.back()} />;
}
