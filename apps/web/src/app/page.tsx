import type { Metadata } from "next";
import MarketingSite from "@/features/marketing-v2/MarketingSite";
import StructuredData from "@/features/marketing-v2/StructuredData";

const TITLE = "Vibaar — Turn your attention into income";
const DESCRIPTION =
  "Turn social attention into protected, paid, trackable orders — a storefront for Instagram and TikTok sellers that takes payment and tracks delivery.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    images: [{ url: "/og/og-default.jpg", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og/og-default.jpg"],
  },
};

export default function Home() {
  return (
    <>
      <StructuredData />
      <MarketingSite />
    </>
  );
}
