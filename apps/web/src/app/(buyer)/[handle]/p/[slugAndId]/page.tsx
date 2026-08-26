import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/serverFetch";
import Product from "@/features/storefront/Product";

const PUBLIC_ID_RE = /^[a-z0-9]{8,10}$/;

function parseHandle(param: string): string | null {
  const h = decodeURIComponent(param).toLowerCase();
  return h.startsWith("@") ? h.slice(1) : null;
}

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
  const handle = parseHandle(params.handle);
  const publicId = parsePublicId(params.slugAndId);
  if (!handle || !publicId) notFound();
  const r = await resolve(publicId);
  if (!r?.product || !r.store?.tag) notFound();

  // Canonical-redirect (one rule): the public id resolves the product → derive the
  // canonical URL from the product's ACTUAL store + current slug → 301 if the incoming
  // handle/slug/case differs. Self-heals wrong-handle and stale-slug links.
  const canonical = canonicalPath(r.product, r.store);
  const incoming = `/@${handle}/p/${decodeURIComponent(params.slugAndId)}`;
  if (incoming !== canonical) redirect(canonical);

  // Server-prime: hand the resolved product + store to the client so it renders on the
  // first paint without a duplicate fetch.
  return <Product initialProduct={r.product} initialStore={r.store} />;
}
