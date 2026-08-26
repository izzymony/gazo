import VendorStoreFront from "@/features/storefront";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
  return <VendorStoreFront storeTag={handle} />;
}
