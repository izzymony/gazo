import type { MetadataRoute } from "next";
import { serverFetch } from "@/lib/api/serverFetch";

// STOREFRONT-URL-REWORK R2g — dynamic sitemap. Emits the canonical public URLs:
// /shop (+ discovery), every /@{handle}, and every /@{handle}/p/{slug}-{publicId}.
// loc values use the handle (business.tag) + public_id — never the internal UUID.
const BASE = "https://vibaar.com";

// Mirrors the backend GenerateSlug + the product route's slugify (cosmetic fallback).
function slugify(title: string): string {
  const s = (title || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "product";
}

interface Store {
  id?: string;
  tag?: string;
}
interface Product {
  public_id?: string;
  slug?: string;
  title?: string;
  business_id?: string;
}

async function getStores(): Promise<Store[]> {
  try {
    // Pre-launch catalog is small; a single pull is fine. At scale this should
    // paginate / split into multiple sitemaps (a launch-scale follow-up).
    const res = await serverFetch<{ data?: { data?: Store[] } }>(
      "/businesses?limit=1000"
    );
    return res?.data?.data ?? [];
  } catch {
    return [];
  }
}

async function getProducts(): Promise<Product[]> {
  try {
    const res = await serverFetch<{ data?: { data?: Product[] } }>(
      "/products?limit=1000"
    );
    return res?.data?.data ?? [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [stores, products] = await Promise.all([getStores(), getProducts()]);

  const tagById = new Map<string, string>();
  for (const s of stores) if (s.id && s.tag) tagById.set(s.id, s.tag);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/shop/new`, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE}/shop/spotlights`, changeFrequency: "daily", priority: 0.7 },
    // Standing pages. Linked from every footer, so they were crawlable but
    // absent from the map.
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/careers`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const storeRoutes = stores
    .filter((s) => s.tag)
    .map((s): MetadataRoute.Sitemap[number] => ({
      url: `${BASE}/@${s.tag}`,
      changeFrequency: "daily",
      priority: 0.8,
    }));

  const productRoutes = products
    .filter(
      (p) => p.public_id && p.business_id && tagById.has(p.business_id)
    )
    .map((p): MetadataRoute.Sitemap[number] => ({
      url: `${BASE}/@${tagById.get(p.business_id as string)}/p/${
        p.slug || slugify(p.title || "")
      }-${p.public_id}`,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

  return [...staticRoutes, ...storeRoutes, ...productRoutes];
}
