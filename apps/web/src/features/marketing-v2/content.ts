export const marketingContent = {
  header: {
    primaryAction: "Start selling",
    beta: "Beta",
  },
  hero: {
    eyebrow: "Seamless, secure, and rewarding",
    titleBefore: "Turn your",
    titleAccent: "attention",
    titleAfter: "into income.",
    body: "Vibaar turns the demand you create on social into protected, paid, trackable orders—from checkout to delivery.",
    primaryAction: "Start selling",
    secondaryAction: "Explore stores",
    secondaryStatus: "Soon",
    imageAlt:
      "Three friends discovering products together on a mobile phone",
    // Floating audience labels — Figma places these around the headline, not
    // on the image. Colour comes from a scoped marketing token per audience.
    floatingTags: [
      { id: "sellers", label: "Sellers" },
      { id: "buyers", label: "Buyers" },
      { id: "creators", label: "Creators" },
    ],
  },
  seller: {
    slides: [
      {
        id: "conversation",
        title: "The sale should not disappear in your DMs.",
        body: "When someone asks “how much?”, send them to a storefront that can take the order, protect the payment and keep delivery moving.",
      },
      {
        id: "storefront",
        title: "Become the brand customers come back to.",
        body: "One link turns your social profile into a trusted storefront where followers can browse, pay safely and track every order.",
      },
    ],
    chat: {
      customer: "How much for this?",
      seller: "It is ready to order—here is the link.",
      status: "Checkout protected",
    },
  },
  buyer: {
    // Two slides, as the interaction spec has for every audience section. The
    // approved single message is split into its two beats rather than making
    // new claims; `offset` rotates the same store list, which is exactly what
    // the source's "scroll 1"/"scroll 2" variants are — one list, two positions.
    slides: [
      {
        id: "discover",
        title: "Discover through people you trust.",
        body: "Browse real storefronts from the sellers you already follow — one scroll, everything they have listed.",
        offset: 0,
      },
      {
        id: "protected",
        title: "Buy with confidence.",
        body: "Your money is held until the order arrives, and you can track it the whole way there.",
        offset: 2,
      },
    ],
    products: [
      {
        store: "Luma Carry",
        category: "Accessories",
        title: "Soft sculpt shoulder bag",
        price: "₦38,000",
        image: "/marketing-v2/buyer-bag.webp",
      },
      {
        store: "Studio Tone",
        category: "Audio",
        title: "Everyday wireless headphones",
        price: "₦54,500",
        image: "/marketing-v2/buyer-headphones.webp",
      },
      {
        store: "Mosaic Made",
        category: "Handmade",
        title: "Stone bead necklace",
        price: "₦16,500",
        image: "/marketing-v2/buyer-jewelry.webp",
      },
      {
        store: "Sunday Form",
        category: "Footwear",
        title: "Everyday trainers",
        price: "₦42,000",
        image: "/marketing-v2/buyer-sneakers.webp",
      },
    ],
  },
  creator: {
    // Creator earning/affiliate attribution is roadmap, not a launch promise.
    // These slides keep the source's creator + performance story while talking
    // only about the discovery tools Vibaar can credibly represent at launch.
    slides: [
      {
        id: "recommend",
        title: "Your taste helps people find what is worth buying.",
        body: "Put your taste to work. Recommend products people can actually buy, from sellers they can trust.",
      },
      {
        id: "discovery",
        title: "Create the signal people shop from.",
        body: "Make useful videos and stories that help people discover trusted sellers without sending them into risky DMs.",
      },
    ],
  },
  closing: {
    statement: "Social shopping, protected from checkout to delivery.",
    imageAlt: "Three friends discovering products together on a mobile phone",
  },
  footer: {
    builtBy: "Built by Tinovalabs",
    // WhatsApp is the route V1 already publishes; no phone line is published
    // anywhere, so that one stays pending rather than invented.
    contactStatus: "Coming soon",
    contacts: [
      {
        id: "whatsapp",
        label: "Message us on WhatsApp",
        href: "https://wa.me/2348148015707",
      },
      // No phone line is published anywhere; null keeps it rendering as pending.
      { id: "phone", label: "or give us a call", href: null },
    ],
    socials: [
      { id: "instagram", label: "Vibaar on Instagram", href: "https://www.instagram.com/vibaar/" },
      { id: "tiktok", label: "Vibaar on TikTok", href: "https://www.tiktok.com/@vibaar" },
      { id: "x", label: "Vibaar on X", href: "https://x.com/vibaar" },
    ],
    // 14:2697 lists four, in this order. About and Careers are real routes
    // under (marketing); nothing here is a placeholder.
    links: [
      { href: "/about", label: "About Us" },
      { href: "/careers", label: "Careers" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
    ],
  },
  faq: {
    title: "Questions, answered straight.",
    groups: [
      {
        id: "sellers",
        label: "Sellers",
        items: [
          {
            q: "How do I actually get paid?",
            a: "Buyers pay at checkout through Paystack — card, bank transfer or USSD. The money is held safely while the order is on its way, then moves to your wallet once delivery is confirmed. You withdraw to your bank from your dashboard.",
          },
          {
            q: "What if something goes wrong with an order?",
            a: "Payment stays in protected escrow until delivery is confirmed, so neither side is exposed while an order is in flight.",
          },
          {
            q: "Do I have to stop selling on Instagram or TikTok?",
            a: "No. Keep posting where your audience already is. Vibaar gives you a storefront link that turns “how much?” into a real, trackable order.",
          },
          {
            q: "What does it cost?",
            a: "Pricing is being finalised ahead of launch. Creating your store and listing products is free while we are in preview.",
          },
        ],
      },
      {
        id: "buyers",
        label: "Buyers",
        items: [
          {
            q: "Is my money safe?",
            a: "Your payment is held until your order is delivered. Until then it is not the seller's to keep.",
          },
          {
            q: "Can I track my delivery?",
            a: "Yes. Orders are shipped through our delivery partner with real courier tracking, so you can follow it the whole way.",
          },
          {
            q: "How do I know a store is real?",
            a: "Sellers can complete identity verification to earn a Verified badge, and every store has a public profile with its products and ratings.",
          },
        ],
      },
      {
        id: "creators",
        label: "Creators",
        items: [
          {
            q: "What can I do on Vibaar today?",
            a: "Share sellers and products you genuinely rate. Your recommendations send people to stores that can take the order safely.",
          },
          {
            q: "Can I earn from recommendations?",
            a: "Not yet. Creator tools are on the roadmap, and we would rather build them properly than promise them early.",
          },
          {
            q: "Do I need my own store to take part?",
            a: "No. You can recommend without selling. If you do decide to sell, the same storefront is waiting.",
          },
        ],
      },
    ],
  },
} as const;
