import VendorStoreFront from "@/features/storefront";
import type { Metadata } from "next";
import { serverFetch } from "@/lib/api/serverFetch";

interface StoreMeta {
  name?: string;
  tag?: string;
  description?: string;
  logo?: string;
}

// STOREFRONT-URL-REWORK: resolve the store server-side by its TAG — one indexed
// by-tag lookup (not the name-search / 500-row pull). Handles both response
// envelopes ({data:store} and {data:{data:store}}).
async function resolveStoreByTag(tag: string): Promise<StoreMeta | undefined> {
  const res = await serverFetch<{ data?: StoreMeta | { data?: StoreMeta } }>(
    `/businesses/by-tag/${encodeURIComponent(tag)}`
  );
  const inner = res?.data;
  if (inner && typeof inner === "object" && "data" in inner) {
    return (inner as { data?: StoreMeta }).data;
  }
  return inner as StoreMeta | undefined;
}

export async function generateMetadata({
  params,
}: {
  params: { storeTag: string };
}): Promise<Metadata> {
  const store = await resolveStoreByTag(params.storeTag);
  const name = store?.name || params.storeTag;
  const title = `${name} · Vibaar`;
  const description = (
    store?.description ||
    `Shop ${name}'s store on Vibaar — discover products and order securely.`
  ).slice(0, 160);
  const images = store?.logo ? [store.logo] : [];
  return {
    title,
    description,
    alternates: { canonical: `/store/${params.storeTag}` },
    openGraph: { title, description, images, type: "website", siteName: "Vibaar" },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

const Page = ({ params }: { params: { storeTag: string } }) => {
  return <VendorStoreFront storeTag={params.storeTag} />;
};

export default Page;
