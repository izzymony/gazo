import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/serverFetch";
import { parseStoreHandle } from "@/lib/urlHelpers";
import Product from "@/features/storefront/Product";

const PUBLIC_ID_RE = /^[a-z0-9]{8,10}$/;

// publicId = the token after the LAST '-' in {slug}-{publicId}; validate the charset
// (hyphen-free, 8–10 [a-z0-9]) so a random string can't be mistaken for an id.
function parsePublicId(slugAndId: string): string | null {
  const decoded = decodeURIComponent(slugAndId);
  const id = decoded.slice(decoded.lastIndexOf("-") + 1);
  return PUBLIC_ID_RE.test(id) ? id : null;
}

// Mirrors the backend GenerateSlug; empty title → 'product'.
function slugify(title: string): string {
  const s = (title || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "product";
}

interface ProductData {
  id?: string;
  title?: string;
  description?: string;
  business_id?: string;
  public_id?: string;
  price?: number;
  image?: string[];
  images?: string[];
  imageSrc?: string;
}
interface StoreData { name?: string; tag?: string; id?: string }

// /p/:publicId nests the product under data.product.
function pickProduct(body: unknown): ProductData | undefined {
  const data = (body as { data?: Record<string, unknown> })?.data;
  if (!data || typeof data !== "object") return undefined;
  return (
    (data.product as ProductData) ??
    (data.data as ProductData) ??
    (data as ProductData)
  );
}
function pickStore(body: unknown): StoreData | undefined {
  const inner = (body as { data?: unknown })?.data;
  if (inner && typeof inner === "object" && "data" in inner) {
    return (inner as { data?: StoreData }).data;
  }
  return inner as StoreData | undefined;
}

// Cached so generateMetadata + the page resolve once per request.
const resolve = cache(async (publicId: string) => {
  const pRes = await serverFetch<unknown>(`/p/${publicId}`);
  const product = pickProduct(pRes);
  if (!product?.id) return null;
  // Merge variant combinations (from the same response) so the primed client has the
  // exact shape getProductByPublicId would produce.
  const combinations =
    (pRes as { data?: { combinations?: unknown[] } })?.data?.combinations ?? [];
  const bRes = await serverFetch<unknown>(`/business/${product.business_id}`);
  const store = pickStore(bRes);
  return { product: { ...product, variant_combinations: combinations }, store };
});

function canonicalPath(product: ProductData, store: StoreData): string {
  return `/@${store.tag}/p/${slugify(product.title || "")}-${product.public_id}`;
}

export async function generateMetadata({
  params,
}: {
  params: { handle: string; slugAndId: string };
}): Promise<Metadata> {
  const publicId = parsePublicId(params.slugAndId);
  if (!publicId) return { title: "Product · Vibaar" };
  const r = await resolve(publicId);
  if (!r?.product?.title) return { title: "Product · Vibaar" };
  const { product, store } = r;
  const title = `${product.title} · ${store?.name || "Vibaar"}`;
  const description = (
    product.description || `Shop ${product.title} on Vibaar`
  ).slice(0, 160);
  const img = product.image?.[0] || product.images?.[0] || product.imageSrc;
  const images = img ? [img] : [];
  return {
    title,
    description,
    alternates: store?.tag ? { canonical: canonicalPath(product, store) } : undefined,
    openGraph: { title, description, images, type: "website", siteName: "Vibaar" },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function Page({
  params,
}: {
  params: { handle: string; slugAndId: string };
}) {
  const handle = parseStoreHandle(params.handle);
  const publicId = parsePublicId(params.slugAndId);
  if (!handle || !publicId) notFound();
  const r = await resolve(publicId);
  if (!r?.product || !r.store?.tag) notFound();

  // Canonical-redirect (one rule): the public id resolves the product → derive the
  // canonical URL from the product's ACTUAL store + current slug → permanent (308)
  // redirect if the incoming handle/slug/case differs. Self-heals wrong-handle and
  // stale-slug links. `incoming` uses the RAW handle (original case, pre-normalize) so
  // a wrong-case handle (/@BukkyStyles) canonicalizes instead of silently serving 200.
  const canonical = canonicalPath(r.product, r.store);
  const rawHandle = decodeURIComponent(params.handle).replace(/^@/, "");
  const incoming = `/@${rawHandle}/p/${decodeURIComponent(params.slugAndId)}`;
  if (incoming !== canonical) permanentRedirect(canonical);

  // SEO: JSON-LD Product structured data (brand = the store's brand name) + a single
  // screen-reader h1 carrying the product title. Server-rendered so crawlers see it.
  const img = r.product.image?.[0] || r.product.images?.[0] || r.product.imageSrc;
  const canonicalUrl = `https://vibaar.com${canonical}`;
  const productLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: r.product.title,
    url: canonicalUrl,
    brand: { "@type": "Brand", name: r.store.name || "Vibaar" },
  };
  if (r.product.description) productLd.description = r.product.description;
  if (img) productLd.image = img;
  if (typeof r.product.price === "number" && r.product.price > 0) {
    productLd.offers = {
      "@type": "Offer",
      price: r.product.price,
      priceCurrency: "NGN",
      availability: "https://schema.org/InStock",
      url: canonicalUrl,
    };
  }

  // Server-prime: hand the resolved product + store to the client so it renders on the
  // first paint without a duplicate fetch.
  return (
    <>
      {/* No <h1> here. It existed because the visible title rendered empty until
          the client seeded the store, so crawlers saw no heading — the client
          renders the server-primed product on its first paint now, and
          ProductInfo's <h1> carries the title. Two h1s on one page is worse for
          the crawler than the problem this solved. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
      />
      <Product initialProduct={r.product} initialStore={r.store} />
    </>
  );
}
