import type { Metadata } from "next";
import DocPage from "@/features/marketing-v2/DocPage";
import { marketingContent } from "@/features/marketing-v2/content";

export const metadata: Metadata = {
  title: "Careers at Vibaar",
  description:
    "How to reach us about working on Vibaar, and what we look for when roles open.",
  openGraph: {
    title: "Careers at Vibaar",
    description: "How to reach us about working on Vibaar, and what we look for when roles open.",
    images: [{ url: "/og/og-careers.jpg", width: 1200, height: 630, alt: "Careers at Vibaar" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Careers at Vibaar",
    description: "How to reach us about working on Vibaar, and what we look for when roles open.",
    images: ["/og/og-careers.jpg"],
  },
};

/**
 * Linked from the marketing footer. There are no approved openings to publish,
 * so this says so plainly and gives a real way to register interest — a page
 * that invented roles would be worse than no page at all.
 */
export default function CareersPage() {
  const { footer } = marketingContent;
  const whatsapp = footer.contacts.find((contact) => contact.href)?.href;

  return (
    <DocPage
      lede="We are a small team building Vibaar in preview. Here is where we are with hiring."
      title="Careers"
    >
      <h2>Open roles</h2>
      <p>
        We are not advertising any roles at the moment. When that changes, the
        openings will be listed on this page.
      </p>

      <h2>Registering interest</h2>
      <p>
        If you would like to be considered when we do open a role, send us a
        message with what you work on and a link to something you have built or
        shipped. We keep those and come back to them.
      </p>
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

      <h2>What we tend to look for</h2>
      <p>
        People who have shipped something to real users and can explain the
        trade-offs they made. Most of what we build touches payments, trust or
        delivery, so care about the details matters more here than breadth.
      </p>
    </DocPage>
  );
}
