/* eslint-disable @typescript-eslint/no-explicit-any */
import ShareModal from "@vibaar/ui/common/ShareModal";
import PageShell from "@vibaar/ui/PageShell";
import PageActionButton from "@vibaar/ui/common/PageActionButton";
import ImageCarousel from "@/features/storefront/carousel";
import ProductComposition from "@/features/storefront/product/ProductComposition";
import ProductInfo from "@/features/storefront/product/ProductInfo";
import ProductVariants from "@/features/storefront/product/ProductVariants";
import { ProductDescription, ProductVendorInfo } from "@/features/storefront/product/ProductInfoSections";
import useBusinessStore from "@/store/businessStore";
import useProductStore from "@/store/productStore";
import { useMemo, useState } from "react";

type VariantOption = string | number | boolean;

interface ProductPreviewProps {
  setIsPreviewOpen: (isOpen: boolean) => void;
  publish: () => void;
  isLoading: boolean;
  discount: number;
}

/**
 * The seller's preview of a product they are about to publish.
 *
 * It is now a DATA ADAPTER over `ProductComposition` — the same layout the
 * buyer's product page renders. It used to be 402 lines of hand-built markup
 * with no `lg:` class anywhere in the file, so at desktop widths it showed a
 * phone layout inside a 1024px column: that was the defect. It had also drifted
 * from the page it claims to preview — a hardcoded five-star rating and
 * "(5 sold)", a "5.4 · 100k" vendor line belonging to nobody, a fallback
 * /addidas.png logo, and a 22px variant chip with no type and no
 * `aria-pressed`, the exact markup `ProductVariants` documents as removed. It
 * imported `ImageCarousel` and never used it, under an eslint-disable.
 *
 * A preview that does not match the thing previewed is worse than none, so the
 * rule here is that this file owns no layout and invents no data: everything
 * comes from the draft, and anything the draft cannot know is simply absent.
 */
export default function ProductsPreview({
  setIsPreviewOpen,
  publish,
  isLoading,
}: ProductPreviewProps) {
  const { productPreview }: any = useProductStore();
  const { store } = useBusinessStore();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<Record<string, VariantOption>>({});

  // The draft holds images as `{ base64, name, toggle }`; the gallery reads
  // `string[]` and discards anything else (carousel.tsx filters on typeof
  // string). Data URLs pass through the image helpers untouched.
  const images: string[] = useMemo(
    () =>
      (productPreview?.images ?? [])
        .map((img: any) => (typeof img === "string" ? img : img?.base64))
        .filter((src: unknown): src is string => typeof src === "string" && src.length > 0),
    [productPreview?.images]
  );

  // Shaped for `ProductVariants`, which requires a stable `id` for its chip
  // keys; the wizard's draft variations carry none.
  const variations: { id: string; name?: string; option?: string; values?: string[] }[] = useMemo(
    () =>
      (productPreview?.variations ?? []).map((v: any, i: number) => ({
        ...v,
        id: v?.id ?? `${v?.name ?? v?.option ?? "variant"}-${i}`,
      })),
    [productPreview?.variations]
  );

  const description: string | undefined = productPreview?.description;
  const truncatedDescription =
    description && description.length > 100 && !isDescriptionExpanded
      ? `${description.substring(0, 100)}...`
      : description;

  return (
    <PageShell
      contentClassName="px-0"
      pageHeader={{
        onBack: () => setIsPreviewOpen(false),
        title: "Product Preview",
        actions: (
          <PageActionButton type="button" loading={isLoading} onClick={publish}>
            Publish
          </PageActionButton>
        ),
      }}>
      <ProductComposition
        gallery={
          <ImageCarousel product={{ ...productPreview, images }} isScrolled={false} />
        }
        info={
          <ProductInfo
            title={productPreview?.title}
            price={productPreview?.price ? +productPreview.price : 0}
            oldPrice={productPreview?.oldPrice}
            // No sales and no rating: this product does not exist yet. The old
            // preview hardcoded five stars and "(5 sold)" on every draft.
            sales={undefined}
            ratings={0}
            liked={isLiked}
            onShare={() => setIsShareModalOpen(true)}
            onLike={() => setIsLiked((v) => !v)}
          />
        }
        renderVariants={
          variations.length > 0
            ? (className) => (
                <ProductVariants
                  variations={variations}
                  selected={selectedVariant}
                  onSelect={(name, option) =>
                    setSelectedVariant((prev) => ({ ...prev, [name]: option }))
                  }
                  className={className}
                />
              )
            : undefined
        }
        // No delivery panel: this is the seller's own view of their own product,
        // which is exactly what the storefront does for `isOwnerView`.
        sections={
          <>
            <ProductDescription
              description={description}
              truncatedDescription={truncatedDescription}
              isExpanded={isDescriptionExpanded}
              setIsExpanded={setIsDescriptionExpanded}
            />
            <hr />
            <ProductVendorInfo store={store} collections={productPreview?.collections} />
          </>
        }
        // No purchase action — Publish lives in the page header above.
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Share Product"
        shareUrl=""
        shareText={`Check out ${productPreview?.title || "this product"} on Vibaar!`}
      />
    </PageShell>
  );
}
