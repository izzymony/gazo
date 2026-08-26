import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/serverFetch";
import Product from "@/features/storefront/Product";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// STOREFRONT-URL-REWORK: the product is resolved by the trailing UUID after `--`
// (slug is cosmetic). GenerateSlug collapses hyphen-runs, so `--` is unambiguous.
function parseProductId(param: string): string | null {
  const id = param.includes("--")
    ? param.slice(param.lastIndexOf("--") + 2)
    : param;
  return UUID_RE.test(id) ? id : null;
}

// Mirrors the backend GenerateSlug (lowercase → non-[a-z0-9_] → '-' → collapse →
// trim); empty (emoji-only titles) → 'product'.
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
  slug?: string;
  image?: string[];
  images?: string[];
  imageSrc?: string;
}
interface StoreData {
  name?: string;
  tag?: string;
}

// Single-object envelope: {data: X} or the canonical {data: {data: X}}.
function pick<T>(body: unknown): T | undefined {
  const inner = (body as { data?: unknown })?.data;
  if (inner && typeof inner === "object" && "data" in inner) {
    return (inner as { data?: T }).data;
  }
  return inner as T | undefined;
}

// The buyer product endpoint (/products/:id) nests the product under
// `data.product` (alongside `combinations`), not `data.data`.
function pickProduct(body: unknown): ProductData | undefined {
  const data = (body as { data?: Record<string, unknown> })?.data;
  if (!data || typeof data !== "object") return undefined;
  return ((data.product as ProductData) ??
    (data.data as ProductData) ??
    (data as ProductData));
}

// Cached so generateMetadata + the page component resolve ONCE per request.
const resolve = cache(async (id: string) => {
  const pRes = await serverFetch<unknown>(`/products/${id}`);
  const product = pickProduct(pRes);
  if (!product?.id) return null;
  const bRes = await serverFetch<unknown>(`/business/${product.business_id}`);
  const store = pick<StoreData>(bRes);
  return { product, store };
});

function canonicalPath(product: ProductData, store: StoreData, id: string) {
  return `/store/${store.tag}/products/${
    product.slug || slugify(product.title || "")
  }--${id}`;
}

export async function generateMetadata({
  params,
}: {
  params: { storeTag: string; productSlugAndId: string };
}): Promise<Metadata> {
  const id = parseProductId(params.productSlugAndId);
  if (!id) return { title: "Product · Vibaar" };
  const r = await resolve(id);
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
    alternates: store?.tag
      ? { canonical: canonicalPath(product, store, id) }
      : undefined,
    openGraph: { title, description, images, type: "website", siteName: "Vibaar" },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function Page({
  params,
}: {
  params: { storeTag: string; productSlugAndId: string };
}) {
  const id = parseProductId(params.productSlugAndId);
  if (!id) notFound();
  const r = await resolve(id);
  if (!r?.product || !r.store?.tag) notFound();

  // Canonical-redirect (one rule for stale slug / wrong store / wrong case):
  // the id resolves the product → derive the canonical store+slug from it → if the
  // incoming path isn't canonical, 301 to canonical. Self-heals shared/old links.
  const canonical = canonicalPath(r.product, r.store, id);
  const incoming = `/store/${params.storeTag}/products/${params.productSlugAndId}`;
  if (incoming !== canonical) redirect(canonical);

  return <Product />;
}
