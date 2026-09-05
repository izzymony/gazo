/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMobileCompatibleImageUrl } from "@/lib/utils";

const ImageCarousel = ({
  product,
  isSeller,
  isScrolled,
}: {
  product: any;
  isSeller: any;
  isScrolled: boolean;
}) => {
  const router = useRouter();
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
      (currentImageIndex === product?.images?.length - 1 && diff < 0)) {
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

    if (shouldSwipe && product?.images?.length > 0) {
      if (translateX < -threshold && currentImageIndex < product.images.length - 1) {
        setCurrentImageIndex(prev => prev + 1);
      } else if (translateX > threshold && currentImageIndex > 0) {
        setCurrentImageIndex(prev => prev - 1);
      }
    }

    setTranslateX(0);
    setVelocity(0);
  };

  // Handle mouse events for desktop
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX);
    };

    const handleMouseUp = () => {
      handleEnd();
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
  }, [isDragging, startX, translateX]);

  // Handle ESC key to close fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when fullscreen is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isFullscreen]);

  // Auto-scroll only when images array actually changes (not on initial load)
  useEffect(() => {
    const currentImages = product?.images || [];
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
  }, [product?.images]);

  return (
    <>
    {/* Mobile/Tablet Carousel */}
    <div
      ref={containerRef}
      className={`w-full relative overflow-hidden lg:hidden ${isSeller.pro && isScrolled
        ? "mt-[65px] z-30 rounded-[10px]"
        : !isScrolled && isSeller.pro
          ? "mt-[65px] z-50 rounded-[20px]"
          : ""
        }`}>
      {/* Back Button */}
      {!isSeller.pro && (
        <div
          onClick={() => router.back()}
          className="absolute top-3 left-2 z-50"
          style={{ pointerEvents: "auto" }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <g>
              <path
                d="M23.832 18.0013H12.1654M12.1654 18.0013L17.9987 12.168M12.1654 18.0013L17.9987 23.8346"
                stroke="white"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </svg>
        </div>
      )}

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
          {product?.images?.map((image: string, index: number) => (
            <div key={index} className="w-full h-full flex-shrink-0">
              <img
                src={
                  typeof image === "string"
                    ? getMobileCompatibleImageUrl(image)
                    : "/PRODUCT IMAGE (2).png"
                }
                alt={`Product Image ${index + 1}`}
                className={`w-full h-full object-cover select-none ${isSeller.pro ? "rounded-[20px]" : ""
                  }`}
                draggable={false}
                style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
              />
            </div>
          )) || (
              <div className="w-full h-full flex-shrink-0">
                <img
                  src="/PRODUCT IMAGE (2).png"
                  alt="Default Product"
                  className={`w-full h-full object-cover select-none ${isSeller.pro ? "rounded-[20px]" : ""
                    }`}
                  draggable={false}
                />
              </div>
            )}
        </div>
      </div>

      {/* Smooth Indicator Dots */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-40">
        {product?.images?.map((_: any, index: number) => (
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
    </div>

      {/* Desktop Airbnb-style Grid with Card Background */}
      <div className="hidden lg:block w-full p-0.5 bg-surface rounded-2xl">
        <div className="grid grid-cols-2 gap-0.5 h-[500px] rounded-xl overflow-hidden">
          {/* Large Image - Left Side */}
          <div
            className="relative cursor-pointer hover:brightness-95 transition-all overflow-hidden"
            onClick={() => setIsFullscreen(true)}
          >
            <img
              src={
                product?.images?.[0]
                  ? getMobileCompatibleImageUrl(product.images[0])
                  : "/PRODUCT IMAGE (2).png"
              }
              alt="Product Image 1"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Small Images - Right Side (4 images in 2x2 grid) */}
          <div className="grid grid-cols-2 grid-rows-2 gap-0.5">
            {[1, 2, 3, 4].map((index) => (
              <div
                key={index}
                className="relative cursor-pointer hover:brightness-95 transition-all overflow-hidden"
                onClick={() => {
                  setCurrentImageIndex(index);
                  setIsFullscreen(true);
                }}
              >
                <img
                  src={
                    product?.images?.[index]
                      ? getMobileCompatibleImageUrl(product.images[index])
                      : "/PRODUCT IMAGE (2).png"
                  }
                  alt={`Product Image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {/* Show "View All Photos" overlay on last image if there are more than 5 images */}
                {index === 4 && product?.images?.length > 5 && (
                  <div
                    className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(0);
                      setIsFullscreen(true);
                    }}
                  >
                    <div className="text-white text-center">
                      <div className="text-lg font-semibold">+{product.images.length - 5}</div>
                      <div className="text-sm">View all photos</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-black z-modal flex items-center justify-center">
          {/* Close Button */}
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-modal w-10 h-10 rounded-full bg-black bg-opacity-50 text-white flex items-center justify-center"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

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
                {product?.images?.map((image: string, index: number) => (
                  <div key={index} className="w-full h-full flex-shrink-0 flex items-center justify-center">
                    <img
                      src={
                        typeof image === "string"
                          ? getMobileCompatibleImageUrl(image)
                          : "/PRODUCT IMAGE (2).png"
                      }
                      alt={`Product Image ${index + 1}`}
                      className="max-w-full max-h-full object-contain select-none"
                      draggable={false}
                      style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
                    />
                  </div>
                )) || (
                  <div className="w-full h-full flex-shrink-0 flex items-center justify-center">
                    <img
                      src="/PRODUCT IMAGE (2).png"
                      alt="Default Product"
                      className="max-w-full max-h-full object-contain select-none"
                      draggable={false}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fullscreen Indicator Dots */}
          {product?.images?.length > 1 && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2">
              {product.images.map((_: any, index: number) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className="transition-all duration-300 cursor-pointer"
                  style={{
                    width: currentImageIndex === index ? '24px' : '8px',
                    height: '8px',
                    borderRadius: '4px',
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
      )}
    </>
  );
};

export default ImageCarousel;
