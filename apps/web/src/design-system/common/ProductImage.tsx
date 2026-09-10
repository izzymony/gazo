/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { cn, getMobileCompatibleImageUrl, PRODUCT_IMAGE_FALLBACK } from "@/lib/utils";

interface ProductImageProps {
  /** The product's `image` array, a single URL, or nothing. */
  src?: string | string[] | null;
  /** Decorative by default — the product's name is beside it in every use. */
  alt?: string;
  className?: string;
}

/**
 * ProductImage — a product's photo, or the placeholder, never a broken icon.
 *
 * There are TWO ways a product ends up without a picture and the app only ever
 * handled one. A product with no `image` at all was given `src=""`, which makes
 * the browser draw its broken-image glyph; that is now a real placeholder. But
 * a product WITH an image whose file is missing — every image uploaded from
 * another environment, which locally is most of them — still 404s, and a 404
 * draws the same broken glyph. Only `onError` catches that one.
 *
 * `key` on the resolved URL resets the failed state when the product changes,
 * so a recycled row does not stay stuck on the placeholder.
 */
export default function ProductImage({ src, alt = "", className }: ProductImageProps) {
  const raw = Array.isArray(src) ? src[0] : src;
  const resolved = raw ? getMobileCompatibleImageUrl(raw) : "";
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [resolved]);

  return (
    <img
      src={!resolved || failed ? PRODUCT_IMAGE_FALLBACK : resolved}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
    />
  );
}
