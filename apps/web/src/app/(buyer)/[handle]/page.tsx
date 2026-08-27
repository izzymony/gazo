import VendorStoreFront from "@/features/storefront";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { serverFetch } from "@/lib/api/serverFetch";

interface StoreMeta {
  id?: string;
  name?: string;
  tag?: string;
  description?: string;
  logo?: string;
}

// STOREFRONT-URL-REWORK Rev 2 — a store lives at /@{handle}. The captured param
// includes the leading '@'; a top-level path WITHOUT it is not a store.
function parseHandle(param: string): string | null {
  const h = decodeURIComponent(param).toLowerCase();
  return h.startsWith("@") ? h.slice(1) : null;
}

// Cached so generateMetadata + the page resolve the store once per request.
const resolveStore = cache(async (handle: string): Promise<StoreMeta | undefined> => {
  const res = await serverFetch<{ data?: StoreMeta | { data?: StoreMeta } }>(
    `/businesses/by-tag/${encodeURIComponent(handle)}`
  );
  const inner = res?.data;
  if (inner && typeof inner === "object" && "data" in inner) {
    return (inner as { data?: StoreMeta }).data;
  }
  return inner as StoreMeta | undefined;
});

// Server-prime the product grid: fetch this vendor's products server-side so the
// storefront renders them on first paint (AllProducts filters `products` by business_id).
// Best-effort — a failure just falls back to the client fetch.
async function resolveProducts(businessId: string): Promise<unknown[]> {
  try {
    const res = await serverFetch<{ data?: { data?: unknown[] } }>(
      `/products?business_id=${encodeURIComponent(businessId)}&page=1&limit=24`
    );
    return res?.data?.data ?? [];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: { handle: string };
}): Promise<Metadata> {
  const handle = parseHandle(params.handle);
  if (!handle) return { title: "Vibaar" };
  const store = await resolveStore(handle);
  const name = store?.name || handle;
  const title = `${name} · Vibaar`;
  const description = (
    store?.description ||
    `Shop ${name}'s store on Vibaar — discover products and order securely.`
  ).slice(0, 160);
  const images = store?.logo ? [store.logo] : [];
  return {
    title,
    description,
    alternates: { canonical: `/@${handle}` },
    openGraph: { title, description, images, type: "website", siteName: "Vibaar" },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function Page({ params }: { params: { handle: string } }) {
  const handle = parseHandle(params.handle);
  if (!handle) notFound(); // top-level path without '@' is not a store
  const store = await resolveStore(handle);
  if (!store?.tag) notFound(); // real 404 for an unknown store
  // Canonicalize a wrong-case handle: /@BukkyStyles → /@bukkystyles (308). Compare the
  // RAW handle (original case) against the canonical lowercase tag before normalizing.
  const rawHandle = decodeURIComponent(params.handle).replace(/^@/, "");
  if (rawHandle !== store.tag) permanentRedirect(`/@${store.tag}`);
  // Server-prime: hand the resolved store + its products to the client so the storefront
  // renders on first paint without the by-tag and /products round-trips. (Store analytics
  // stay a client fetch — a secondary, non-blocking stat strip.)
  const initialProducts = store.id ? await resolveProducts(store.id) : [];

  // SEO: JSON-LD Store structured data (brand name) + a single screen-reader h1.
  const canonicalUrl = `https://vibaar.com/@${store.tag}`;
  const storeLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: store.name || store.tag,
    url: canonicalUrl,
  };
  if (store.description) storeLd.description = store.description;
  if (store.logo) {
    storeLd.logo = store.logo;
    storeLd.image = store.logo;
  }

  return (
    <>
      <h1 className="sr-only">{store.name || store.tag}</h1>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storeLd) }}
      />
      <VendorStoreFront
        storeTag={handle}
        initialStore={store}
        initialProducts={initialProducts}
      />
    </>
  );
}
