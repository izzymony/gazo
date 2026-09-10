/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import useModalBehaviour from "@vibaar/ui/common/useModalBehaviour";
import IconButton from "@vibaar/ui/common/IconButton";
import { X } from "@vibaar/ui/icons";
import { getMobileCompatibleImageUrl, cn } from "@/lib/utils";

const ImageCarousel = ({
  product,
  isScrolled,
}: {
  product: any;
  isScrolled: boolean;
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [lastMoveTime, setLastMoveTime] = useState(Date.now());
  const [velocity, setVelocity] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clickStartTime, setClickStartTime] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousImagesRef = useRef<string[]>([]);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const closeFullscreen = useCallback(() => setIsFullscreen(false), []);

  // Escape, scroll-lock, focus trap and focus restore — the same behaviour
  // Dialog gets, behind this viewer's own full-bleed chrome. It previously
  // hand-rolled the first two and omitted the rest, so the viewer had no
  // dialog role, focus could Tab out to the page underneath, and closing
  // dropped you back at the top of the product page.
  useModalBehaviour({ isOpen: isFullscreen, onClose: closeFullscreen, panelRef: fullscreenRef });

  const FALLBACK_IMAGE = "/PRODUCT IMAGE (2).png";

  // One normalised list for every surface: the mobile strip, the desktop grid and
  // the fullscreen viewer each used to re-derive this inline, with a different
  // fallback shape each time.
  const images: string[] = useMemo(() => {
    const raw: unknown[] = Array.isArray(product?.images) ? product.images : [];
    const resolved = raw
      .filter((img): img is string => typeof img === "string" && img.length > 0)
      .map(getMobileCompatibleImageUrl);
    return resolved.length > 0 ? resolved : [FALLBACK_IMAGE];
  }, [product?.images]);

  const heroImage = images[0];
  const thumbnails = images.slice(1, 5);

  const SWIPE_THRESHOLD = 0.25; // 25% of image width to trigger swipe
  const VELOCITY_THRESHOLD = 0.3; // Velocity needed for quick swipe
  const EDGE_RESISTANCE = 0.3; // Resistance factor at edges

  const handleStart = (clientX: number) => {
    setIsDragging(true);
    setStartX(clientX);
    setTranslateX(0);
    setVelocity(0);
    setHasMoved(false);
    setClickStartTime(Date.now());
    setLastMoveTime(Date.now());
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;

    const now = Date.now();
    const diff = clientX - startX;
    const timeDiff = now - lastMoveTime;
    const currentVelocity = timeDiff > 0 ? Math.abs(diff) / timeDiff : 0;

    // Mark as moved if significant movement detected
    if (Math.abs(diff) > 5) {
      setHasMoved(true);
    }

    // Add resistance at edges
    let resistedDiff = diff;
    if ((currentImageIndex === 0 && diff > 0) ||
      (currentImageIndex === images.length - 1 && diff < 0)) {
      resistedDiff = diff * EDGE_RESISTANCE;
    }

    setTranslateX(resistedDiff);
    setVelocity(currentVelocity);
    setLastMoveTime(now);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const now = Date.now();
    const clickDuration = now - clickStartTime;

    // Check if this was a click (short duration + no significant movement) and not already in fullscreen
    if (clickDuration < 300 && !hasMoved && !isFullscreen) {
      setIsFullscreen(true);
      return;
    }

    const containerWidth = containerRef.current?.offsetWidth || 345;
    const threshold = containerWidth * SWIPE_THRESHOLD;
    const shouldSwipe = Math.abs(translateX) > threshold || velocity > VELOCITY_THRESHOLD;

    if (shouldSwipe && images.length > 0) {
      if (translateX < -threshold && currentImageIndex < images.length - 1) {
        setCurrentImageIndex(prev => prev + 1);
      } else if (translateX > threshold && currentImageIndex > 0) {
        setCurrentImageIndex(prev => prev - 1);
      }
    }

    setTranslateX(0);
    setVelocity(0);
  };

  // Desktop mouse drag.
  //
  // The handlers close over state that changes on every pointer move
  // (`translateX` decides whether a drag became a swipe), so they cannot be
  // attached once and left. The previous version listed that state in the
  // effect's deps instead, which tore down and re-added three document
  // listeners on every pixel of a drag. Holding the latest handler in a ref
  // gives the listeners current values while the subscription itself only
  // changes when a drag starts or ends.
  const latestMove = useRef(handleMove);
  const latestEnd = useRef(handleEnd);
  latestMove.current = handleMove;
  latestEnd.current = handleEnd;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      latestMove.current(e.clientX);
    };

    const handleMouseUp = () => {
      latestEnd.current();
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('mouseleave', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('mouseleave', handleMouseUp);
      };
    }
  }, [isDragging]);

  // Auto-scroll only when images array actually changes (not on initial load)
  useEffect(() => {
    const currentImages = images;
    const previousImages = previousImagesRef.current;

    // Only auto-scroll if:
    // 1. We have images
    // 2. The array actually changed (different from previous)
    // 3. We have more than 1 image
    if (currentImages.length > 1 &&
        previousImages.length > 0 &&
        JSON.stringify(currentImages) !== JSON.stringify(previousImages)) {
      const lastIndex = currentImages.length - 1;
      setCurrentImageIndex(lastIndex);
    }

    // Update ref for next comparison
    previousImagesRef.current = currentImages;
  }, [images]);

  return (
    <>
    {/* Mobile/Tablet Carousel */}
    {/* The two former branches differed only in radius, and both pinned a
        `mt-[65px]` that hardcoded the header's height; the header is a sticky
        overlay now and reserves its own space. */}
    <div
      ref={containerRef}
      className="w-full relative overflow-hidden lg:hidden rounded-card">

      {/* Image Container with smooth transitions */}
      <div
        className="relative w-full aspect-square"
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => {
          e.preventDefault(); // Prevent page scroll during swipe
          handleMove(e.touches[0].clientX);
        }}
        onTouchEnd={handleEnd}
        onMouseDown={(e) => {
          e.preventDefault();
          handleStart(e.clientX);
        }}
        style={{ touchAction: 'pan-y pinch-zoom' }} // Allow vertical scroll but control horizontal
      >
        <div
          className="flex h-full"
          style={{
            transform: `translateX(calc(-${currentImageIndex * 100}% + ${translateX}px))`,
            transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'transform'
          }}
        >
          {images.map((image: string, index: number) => (
            <div key={index} className="w-full h-full flex-shrink-0">
              <img
                src={image}
                alt=""
                // Only the first slide is above the fold; the rest were all
                // fetched eagerly on mount, on a mobile-first product page.
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "auto"}
                decoding="async"
                className="w-full h-full object-cover select-none rounded-card"
                draggable={false}
                style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Indicator dots. The button is a 36px touch target (the pip is only the
          visible part) — these used to be 6px squares, well under the minimum,
          on the primary product surface. Styling is tokens rather than an
          inline style object. */}
      {images.length > 1 && (
        <div
          role="tablist"
          aria-label="Product images"
          className="absolute bottom-1 left-1/2 z-dropdown flex -translate-x-1/2 items-center">
          {images.map((_: string, index: number) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={currentImageIndex === index}
              aria-label={`Go to image ${index + 1}`}
              onClick={() => setCurrentImageIndex(index)}
              className="flex h-9 w-5 items-center justify-center focus-visible:outline-none">
              <span
                aria-hidden="true"
                className={cn(
                  "block h-1.5 rounded-pill backdrop-blur-sm transition-all duration-300",
                  currentImageIndex === index ? "w-5 bg-white/90" : "w-1.5 bg-white/40"
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>

      {/* Desktop gallery. The thumbnail column adapts to how many images exist —
          it used to map [1,2,3,4] unconditionally, so a single-image product
          rendered four broken-image tiles beside it. */}
      <div className="hidden lg:block w-full p-0.5 bg-surface rounded-card">
        <div
          className={cn(
            "grid gap-0.5 h-[500px] rounded-card overflow-hidden",
            thumbnails.length > 0 ? "grid-cols-2" : "grid-cols-1"
          )}>
          {/* Large Image - Left Side */}
          <button type="button" aria-label="Open image viewer"
            className="text-left relative cursor-pointer hover:brightness-95 transition-all overflow-hidden"
            onClick={() => setIsFullscreen(true)}
          >
            <img
              src={heroImage}
              alt=""
              className="w-full h-full object-cover"
            />
          </button>

          {/* Thumbnails — up to four, only for images that exist. */}
          {thumbnails.length > 0 && (
          <div
            className={cn(
              "grid gap-0.5",
              thumbnails.length === 1 ? "grid-cols-1" : "grid-cols-2",
              thumbnails.length > 2 ? "grid-rows-2" : "grid-rows-1"
            )}>
            {thumbnails.map((src: string, i: number) => {
              const index = i + 1;
              const isLastTile = i === thumbnails.length - 1;
              const remaining = images.length - (thumbnails.length + 1);
              return (
              <button
                type="button"
                key={index}
                aria-label={`Open image ${index + 1} of ${images.length}`}
                className="text-left relative cursor-pointer hover:brightness-95 transition-all overflow-hidden"
                onClick={() => {
                  setCurrentImageIndex(index);
                  setIsFullscreen(true);
                }}
              >
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                {/* "+N" overlay on the last tile when more images remain. It was
                    a nested <button> inside another button — invalid interactive
                    content; the tile itself carries the click now. */}
                {isLastTile && remaining > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-overlay/60 flex flex-col items-center justify-center text-white">
                    <span className="text-h2 font-semibold">+{remaining}</span>
                    <span className="text-body-sm">View all photos</span>
                  </span>
                )}
              </button>
              );
            })}
          </div>
          )}
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div
          ref={fullscreenRef}
          role="dialog"
          aria-modal="true"
          aria-label="Product images"
          tabIndex={-1}
          className="fixed inset-0 bg-overlay z-modal flex items-center justify-center outline-none">
          {/* Close — was an unnamed <button> wrapping a bare SVG, so it
              announced nothing at all. */}
          <IconButton
            icon={X}
            label="Close image viewer"
            onClick={closeFullscreen}
            className="absolute top-4 right-4 z-modal bg-overlay/50 text-white"
          />

          {/* Fullscreen Image Container */}
          <div className="w-full h-full flex items-center justify-center px-4">
            <div
              className="w-full max-w-screen-sm h-[80vh] relative"
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
              style={{ touchAction: 'pan-y pinch-zoom' }}
            >
              <div
                className="flex h-full"
                style={{
                  transform: `translateX(calc(-${currentImageIndex * 100}% + ${translateX}px))`,
                  transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  willChange: 'transform'
                }}
              >
                {images.map((image: string, index: number) => (
                  <div key={index} className="w-full h-full flex-shrink-0 flex items-center justify-center">
                    <img
                      src={image}
                      alt={`Product image ${index + 1} of ${images.length}`}
                      loading={index === 0 ? "eager" : "lazy"}
                      decoding="async"
                      className="max-w-full max-h-full object-contain select-none"
                      draggable={false}
                      style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Fullscreen Indicator Dots */}
          {images.length > 1 && (
            <div
              role="tablist"
              aria-label="Product images"
              className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center">
              {images.map((_: string, index: number) => (
                <button
                  key={index}
                  type="button"
                  role="tab"
                  aria-selected={currentImageIndex === index}
                  aria-label={`Go to image ${index + 1}`}
                  onClick={() => setCurrentImageIndex(index)}
                  className="flex h-9 w-6 items-center justify-center focus-visible:outline-none">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "block h-2 rounded-pill backdrop-blur-sm transition-all duration-300",
                      currentImageIndex === index ? "w-6 bg-white/90" : "w-2 bg-white/40"
                    )}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ImageCarousel;
