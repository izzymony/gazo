import VendorStoreFront from "@/features/storefront"
import type { Metadata } from "next"
import { serverFetch } from "@/lib/api/serverFetch"

interface StoreMeta {
  name?: string
  tag?: string
  description?: string
  logo?: string
}

export async function generateMetadata(
  { params }: { params: { vendor: string } }
): Promise<Metadata> {
  const vendor = decodeURIComponent(params.vendor)
  // Mirror the client's fetchStoresBySearch: /businesses?search + exact tag/name match
  const res = await serverFetch<{ data?: { data?: StoreMeta[] } }>(
    `/businesses?search=${encodeURIComponent(vendor)}`
  )
  const stores = res?.data?.data ?? []
  const store = stores.find(
    (s) =>
      s.tag?.toLowerCase() === vendor.toLowerCase() ||
      s.name?.toLowerCase() === vendor.toLowerCase()
  )
  const name = store?.name || vendor
  const title = `${name} · Vibaar`
  const description = (
    store?.description ||
    `Shop ${name}'s store on Vibaar — discover products and order securely.`
  ).slice(0, 160)
  const images = store?.logo ? [store.logo] : []
  return {
    title,
    description,
    openGraph: { title, description, images, type: "website", siteName: "Vibaar" },
    twitter: { card: "summary_large_image", title, description, images },
  }
}

const page = () => {
  return (
    <VendorStoreFront/>
  )
}

export default page
