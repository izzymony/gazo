import Product from '@/features/storefront/Product'
import type { Metadata } from 'next'
import { serverFetch } from '@/lib/api/serverFetch'
import React from 'react'

interface ProductMeta {
  title?: string
  description?: string
  images?: string[]
  imageSrc?: string
  image?: string
}
interface ProductResponse {
  data?: ({ product?: ProductMeta } & ProductMeta) | null
}

export async function generateMetadata(
  { params }: { params: { vendor: string; productId: string } }
): Promise<Metadata> {
  const vendor = decodeURIComponent(params.vendor)
  const res = await serverFetch<ProductResponse>(`/business/get-product/${params.productId}`)
  const p = res?.data?.product ?? res?.data
  if (!p?.title) {
    return { title: `Product · ${vendor} · Vibaar` }
  }
  const title = `${p.title} · ${vendor}`
  const description = (p.description || `Shop ${p.title} on Vibaar`).slice(0, 160)
  const img = p.images?.[0] || p.imageSrc || p.image
  const images = img ? [img] : []
  return {
    title,
    description,
    openGraph: { title, description, images, type: 'website', siteName: 'Vibaar' },
    twitter: { card: 'summary_large_image', title, description, images },
  }
}

const page = () => {
  return (
    <Product/>
  )
}

export default page
