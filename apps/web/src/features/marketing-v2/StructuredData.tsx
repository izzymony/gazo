import { marketingContent } from "./content";

const SITE = "https://vibaar.com";

/**
 * Structured data for the marketing page.
 *
 * Two graphs:
 *   Organization — who the site belongs to, its mark, and the accounts that
 *                  confirm it. `sameAs` is what lets a search engine tie the
 *                  domain to the verified social profiles.
 *   FAQPage      — the questions the page already answers. Every entry here is
 *                  rendered on the page and reachable through the category
 *                  tabs; nothing is added that a reader cannot get to.
 *
 * Emitted as one script so it costs a single node, and JSON.stringify keeps the
 * answers escaped — the copy contains quotes and en dashes.
 */
export default function StructuredData() {
  const { faq, footer } = marketingContent;

  const graph = [
    {
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: "Vibaar",
      url: SITE,
      logo: `${SITE}/brand/logo-yellow.svg`,
      description:
        "Vibaar turns the demand social sellers create into real, paid, trackable orders — from checkout to delivery.",
      sameAs: footer.socials.map((social) => social.href),
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE}/#faq`,
      mainEntity: faq.groups.flatMap((group) =>
        group.items.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        }))
      ),
    },
  ];

  return (
    <script
      type="application/ld+json"
      // The payload is built from local content, not user input.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
      }}
    />
  );
}
