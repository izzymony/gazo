/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Accordion from "@vibaar/ui/common/Accordion";
import DisclosureButton from "@vibaar/ui/common/DisclosureButton";
import Button from "@vibaar/ui/common/Button";
import ShareModal from "@vibaar/ui/common/ShareModal";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import SelectVariants from "@/design-system/VariantSelector";
import ImageCarousel from "@/features/storefront/carousel";
import { Variation } from "@/lib/types";
import { calculateDiscountPercentage, formatCurrency } from "@/lib/utils";
import useBusinessStore from "@/store/businessStore";
import useProductStore from "@/store/productStore";
import Image from "next/image";
import { useState } from "react";
import { BsThreeDotsVertical, MdFavoriteBorder, PiShareFatThin, FaStar, FiUsers } from "@vibaar/ui/icons";
import { toast } from "sonner";
import Badge from "@vibaar/ui/common/Badge";

type VariantOption = string | number | boolean;

interface ProductPreviewProps {
  setIsPreviewOpen: (isOpen: boolean) => void;
  publish: () => void;
  isLoading: boolean;
  discount: number;
}

export default function ProductsPreview({
  setIsPreviewOpen,
  publish,
  isLoading,
  discount,
}: ProductPreviewProps) {
  const { productPreview }: any = useProductStore();
  const { store } = useBusinessStore();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [visibleSections, setVisibleSections] = useState({
    description: true,
    vendor: true,
  });
  const [selectedVariant, setSelectedVariant] = useState<
    Record<string, VariantOption>
  >({});

  const SWIPE_THRESHOLD = 0.25;
  const VELOCITY_THRESHOLD = 0.3;

  const handleStart = (clientX: number) => {
    setIsDragging(true);
    setStartX(clientX);
    setTranslateX(0);
    setVelocity(0);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    const diff = clientX - startX;
    setTranslateX(diff);
    setVelocity(Math.abs(diff) / 10);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const containerWidth = 400; // Approximate width
    const threshold = containerWidth * SWIPE_THRESHOLD;
    const shouldSwipe = Math.abs(translateX) > threshold || velocity > VELOCITY_THRESHOLD;

    if (shouldSwipe && productPreview?.images?.length > 0) {
      if (translateX < -threshold && currentImageIndex < productPreview.images.length - 1) {
        setCurrentImageIndex(prev => prev + 1);
      } else if (translateX > threshold && currentImageIndex > 0) {
        setCurrentImageIndex(prev => prev - 1);
      }
    }

    setTranslateX(0);
    setVelocity(0);
  };

  const toggleSection = (section: keyof typeof visibleSections) => {
    setVisibleSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleLikeClick = () => {
    setIsLiked(!isLiked);
  };

  const handleVariantClick = (variantName: string, option: VariantOption) => {
    setSelectedVariant((prev) => ({
      ...prev,
      [variantName]: option,
    }));
  };

  const handleShareClick = () => {
    // Only use Web Share API on mobile devices (desktop share sheets aren't useful)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (navigator.share && isMobile) {
      navigator
        .share({
          title: productPreview?.title,
          url: window.location.href,
        })
        .then(() => { })
        .catch(console.error);
    } else {
      // Desktop: open share modal
      setIsShareModalOpen(true);
    }
  };

  const truncatedDescription =
    productPreview?.description &&
      productPreview?.description?.length > 100 &&
      !isDescriptionExpanded
      ? `${productPreview?.description.substring(0, 100)}...`
      : productPreview?.description;

  return (
    <PageShell
      header={
        <Header
          onBack={() => setIsPreviewOpen(false)}
          title="Product Preview"
        />
      }
      contentClassName="px-0"
      footerAction={
        <Button type="button" loading={isLoading} onClick={publish}>
          Publish
        </Button>
      }>
      <div>
        {/* Image Carousel with Enhanced Swipe */}
        <div
          className="w-full h-[45vh] relative overflow-hidden bg-surface-muted cursor-pointer"
          onTouchStart={(e) => handleStart(e.touches[0].clientX)}
          onTouchMove={(e) => {
            e.preventDefault();
            handleMove(e.touches[0].clientX);
          }}
          onTouchEnd={handleEnd}
          onMouseDown={(e) => {
            e.preventDefault();
            handleStart(e.clientX);
          }}
          onClick={() => {
            // TODO: Open full-screen image viewer for actual aspect ratio
          }}>

          {/* Image Container with smooth transitions */}
          <div className="relative w-full h-full overflow-hidden">
            <div
              className="flex h-full"
              style={{
                transform: `translateX(calc(-${currentImageIndex * 100}% + ${translateX}px))`,
                transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'transform'
              }}
            >
              {productPreview?.images?.map((image: any, index: number) => (
                <div key={index} className="w-full h-full flex-shrink-0">
                  <Image
                    width={0}
                    height={0}
                    src={image?.base64 || "/PRODUCT IMAGE (2).png"}
                    alt={`Product Image ${index + 1}`}
                    className="w-full h-full object-cover select-none"
                    draggable={false}
                    style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
                  />
                </div>
              )) || (
                <div className="w-full h-full flex-shrink-0">
                  <Image
                    width={0}
                    height={0}
                    src="/PRODUCT IMAGE (2).png"
                    alt="Default Product"
                    className="w-full h-full object-cover select-none"
                    draggable={false}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Image index display */}
          <div className="absolute bottom-2 right-3 text-caption bg-surface-muted text-white p-2 rounded-full">
            {currentImageIndex + 1} / {productPreview?.images?.length || 1}
          </div>

          {/* Smooth Indicator Dots */}
          {productPreview?.images?.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1.5">
              {productPreview.images.map((_: any, index: number) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className="transition-all duration-300 cursor-pointer"
                  style={{
                    width: currentImageIndex === index ? '20px' : '6px',
                    height: '6px',
                    borderRadius: '3px',
                    backgroundColor: currentImageIndex === index
                      ? 'rgba(255, 255, 255, 0.9)'
                      : 'rgba(255, 255, 255, 0.4)',
                    backdropFilter: 'blur(2px)'
                  }}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="w-full px-4">
          <div className="flex flex-row items-center gap-1 my-2">
            <h1 className="text-body font-medium mr-auto max-w-[70%]">
              {productPreview?.title}
            </h1>

            <div onClick={handleShareClick}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5">
                <PiShareFatThin size={20} className="text-foreground-primary" />
              </span>
            </div>
            <div onClick={handleLikeClick}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5">
                <MdFavoriteBorder size={20} className="text-foreground-primary" />
              </span>
            </div>
          </div>

          <div className="flex items-center  w-full">
            <span className="text-xl font-medium">
              {formatCurrency(productPreview?.price ? +productPreview.price : 0)}
            </span>

            {productPreview?.oldPrice && +productPreview.oldPrice > 0 && (
              <>
                <span className="ml-2 mt-1 text-foreground-secondary line-through text-body-sm font-normal">
                  {formatCurrency(
                    productPreview?.oldPrice ? +productPreview.oldPrice : 0
                  )}
                </span>
                <div className="ml-auto text-brandInk font-normal rounded-full bg-brand px-3 py-1 text-caption">
                  {Math.floor(discount)}% OFF
                </div>
              </>
            )}
          </div>

          <div className="flex items-center space-x-1 text-body">
            {Array(5)
              .fill(null)
              .map((_: string, index: number) => (
                <div key={index}>
                  <FaStar size={14} className="text-warning-foreground" />
                </div>
              ))}
            <p className="text-foreground-muted text-body font-normal">(5 sold)</p>
          </div>
        </div>

        <hr className="my-3" />

        {/* Variants Section */}
        <div className="w-full px-5">
          <p className="font-medium text-body">Select variants</p>
          {productPreview?.variations?.map(
            (variant: Variation, index: number) => (
              <div key={index} className="mt-4">
                <h3 className="text-caption font-medium">
                  {variant?.name}:{selectedVariant[variant?.name as string]}
                </h3>
                <div className="flex mt-2 space-x-2">
                  {variant?.values?.map((option: string, optionIndex: number) => (
                    <button
                      key={optionIndex}
                      className={`px-4 h-[22px] text-body-sm bg-surface-subtle rounded-full ${(selectedVariant[variant?.name as string] || "") ===
                        option
                        ? "bg-brand text-brandInk"
                        : ""
                        }`}
                      onClick={() =>
                        handleVariantClick(variant.name || "", option)
                      }>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
        <hr className="my-3" />

        {/* Product Description */}
        <Accordion
          title="Product description"
          initiallyOpen={true}
          className="px-5">
          <div className="pb-2 rounded-card">
            <p className="text-body-sm font-normal text-foreground-secondary line-clamp-3">
              {truncatedDescription}
            </p>
            {productPreview?.description &&
              productPreview?.description.length > 100 &&
              !isDescriptionExpanded && (
                <DisclosureButton
              expanded={isDescriptionExpanded}
              onClick={() => {
                    setIsDescriptionExpanded(!isDescriptionExpanded);
                  }}
              className=" text-brandDeep text-body-sm font-medium">
              Read more
            </DisclosureButton>
              )}
            {isDescriptionExpanded && (
              <DisclosureButton
              expanded={isDescriptionExpanded}
              onClick={() => {
                  setIsDescriptionExpanded(!isDescriptionExpanded);
                }}
              className="ml-2 text-brandDeep text-body-sm">
              Show less
            </DisclosureButton>
            )}
          </div>
        </Accordion>

        <hr />

        {/* Vendor Info */}
        <Accordion
          title="About this vendor"
          initiallyOpen={true}
          className="px-5">
          <div className=" pb-2 rounded-card">
            <div className="flex items-center mt-2">
              <Image
                width={52}
                height={52}
                src={
                  typeof store?.logo === "string" ? store?.logo : "/addidas.png"
                }
                alt="Vendor"
                className="w-[52px] h-[52px] rounded-full"
              />
              <div className="ml-4">
                <h3 className="font-medium text-body-sm">{store?.name}</h3>
                <p className="text-foreground-muted text-caption font-normal flex items-center gap-1">
                  {store?.category} ·{" "}
                  <FaStar size={12} className="text-warning-foreground" />
                  5.4 · 100k{" "}
                  <FiUsers size={12} className="text-foreground-secondary" />
                </p>
              </div>

              <div className="text-brandDeep text-body-sm ml-auto font-medium">
                Follow
              </div>
            </div>
            <p className="text-body-sm font-normal mt-2 text-foreground-secondary">
              {store?.description}
            </p>

            <div className="flex flex-wrap gap-3 mt-3">
              {productPreview?.collections?.map((col: string, index: number) => (
                <Badge key={index}>
                  {col}
                </Badge>
              ))}
            </div>
          </div>
        </Accordion>
      </div>

      {/* Share Modal for Desktop */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Share Product"
        shareUrl={typeof window !== 'undefined' ? window.location.href : ''}
        shareText={`Check out ${productPreview?.title || 'this product'} on Vibaar!`}
      />
    </PageShell>
  );
}
