"use client";
import Image from "next/image";
import { slidesData } from "./slidesData";
import useMediaActive from "../common/useMediaActive";

interface SlideContentProps {
  currentSlide: number;
  onSlideChange: (index: number) => void;
}

export default function SlideContent({ currentSlide, onSlideChange }: SlideContentProps) {
  const showWordmark = useMediaActive("md");

  return (
    <div className="relative">
      {/* Desktop wordmark. Gated on a MOUNT, not `hidden md:block` — a
          display:none image is still fetched, so the old class shipped it to
          every phone that never saw it. `useMediaActive` returns false on the
          server, so it does not reach the mobile HTML at all.

          The box is reserved at its rendered height so mounting it after
          hydration does not shift the column, which is vertically centred and
          would otherwise jump by half the logo's height. */}
      <div className="hidden md:flex md:h-14 md:mb-12 md:items-center md:justify-center">
        {showWordmark && (
          <Image
            src="/brand/logo-black.svg"
            alt="Company Logo"
            width={180}
            height={52}
            priority
          />
        )}
      </div>

      {/* Slide Text Content */}
      <div className="grid grid-cols-1">
        {/* The slides cross-fade, so they must overlap — but stacking them in
            the same GRID CELL sizes the box to the tallest of them instead of
            to a number someone picked. It was `h-20 sm:h-28`, chosen for an
            18px mobile headline, and once the column narrowed and the desktop
            headline grew to 40px it clipped both the title and the second line
            of every description. Nothing here needs a fixed height. */}
        <div className="grid">
          {slidesData.map((slide, index) => (
            <div
              key={`text-${index}`}
              aria-hidden={currentSlide !== index}
              className={`col-start-1 row-start-1 w-full text-center transition-opacity duration-500 ${currentSlide === index ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}>
              {/* No `whitespace-nowrap`: the content column is a readable
                  measure, not whatever the longest title happens to need. */}
              <h1 className="text-foreground-primary text-h1 md:text-display md:leading-[44px] font-medium tracking-wide text-balance">
                {slide.title}
              </h1>
              <div className="mt-3 md:leading-[24px]">{slide.description}</div>
            </div>
          ))}
        </div>

        {/* Slide Indicators */}
        <div className="flex justify-center py-5 ">
          {slidesData.map((_, index) => (
            <button
              key={`indicator-${index}`}
              onClick={() => onSlideChange(index)}
              className={`h-[4px] rounded-full transition-all duration-300 ${currentSlide === index
                ? "w-[14px] bg-brand"
                : "w-[4px] bg-surface-strong"
                }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
