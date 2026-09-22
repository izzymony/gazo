import type { Metadata } from "next";
import DocPage from "@/features/marketing-v2/DocPage";
import { marketingContent } from "@/features/marketing-v2/content";

export const metadata: Metadata = {
  title: "About Vibaar",
  description:
    "Vibaar turns social selling into real, paid, trackable orders — what we build, and who we build it for.",
  openGraph: {
    title: "About Vibaar",
    description: "Vibaar turns social selling into real, paid, trackable orders — what we build, and who we build it for.",
    images: [{ url: "/og/og-about.jpg", width: 1200, height: 630, alt: "About Vibaar" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Vibaar",
    description: "Vibaar turns social selling into real, paid, trackable orders — what we build, and who we build it for.",
    images: ["/og/og-about.jpg"],
  },
};

/**
 * Linked from the marketing footer, so it has to be a real destination rather
 * than a placeholder. Everything here restates what the product already claims
 * on the landing page; nothing about the company is invented for the page.
 */
export default function AboutPage() {
  const { footer } = marketingContent;
  const whatsapp = footer.contacts.find((contact) => contact.href)?.href;

  return (
    <DocPage
      lede="Vibaar is where social selling becomes a real order — one that is paid for safely and can be tracked the whole way."
      title="About Vibaar"
    >
      <h2>What we build</h2>
      <p>
        Most selling on Instagram and TikTok still ends in a direct message.
        Someone asks &ldquo;how much?&rdquo;, a price is sent, and the order
        depends on both sides trusting a screenshot. Vibaar gives sellers a
        storefront link that can take the order properly: the buyer pays at
        checkout, the parcel is tracked from the seller to the door, and the
        seller’s earnings become available once delivery is confirmed.
      </p>

      <h2>Who it is for</h2>
      <p>
        Sellers who already have an audience and want the sale to survive the
        conversation. Buyers who want to know a store is real and their money is
        not gone the moment they send it. Creators who recommend things and want
        those recommendations to lead somewhere that can actually take an order.
      </p>

      <h2>Where we are</h2>
      <p>
        We are building for Nigeria first, on the payment methods and delivery
        partners people here already use. Vibaar is in preview: the storefronts,
        checkout and order tracking are live, and creator tools are
        still ahead of us.
      </p>

      <h2>Built by Tinovalabs</h2>
      <p>
        Vibaar is a Tinovalabs product, and started life as myInstaShop. Same
        team, same product, a name that travels further than the one we began
        with.
      </p>

      <h2>Talk to us</h2>
      <p>
        {whatsapp ? (
          <a href={whatsapp} rel="noopener noreferrer" target="_blank">
            Message us on WhatsApp
          </a>
        ) : (
          "Reach us through the contact links in the footer."
        )}
        .
      </p>
    </DocPage>
  );
}
