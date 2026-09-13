"use client";
import Image from "next/image";
import { slidesData } from "./slidesData";

interface SlideContentProps {
  currentSlide: number;
  onSlideChange: (index: number) => void;
}

export default function SlideContent({ currentSlide, onSlideChange }: SlideContentProps) {
  return (
    <div className="relative">
      {/* Desktop Logo (hidden on mobile) */}
      <Image
        src="/brand/logo-black.svg"
        alt="Company Logo"
        width={180}
              height={52}
        className="hidden md:block mx-auto mb-12"
        priority
      />

      {/* Slide Text Content */}
      <div className="grid grid-cols-1">
        {/* Fixed so the cross-fading slides, which are absolute, have a box to
            sit in. h-28 was sized for the 40px desktop headline and left ~32px
            of dead space under an 18px mobile one — which on a 667px phone was
            the difference between the legal line sitting above the fold and
            below it. */}
        <div className="relative h-20 sm:h-28 overflow-hidden">
          {slidesData.map((slide, index) => (
            <div
              key={`text-${index}`}
              className={`absolute w-full text-center transition-opacity duration-500 ${currentSlide === index ? "opacity-100" : "opacity-0"
                }`}>
              <h1 className="text-foreground-primary text-lg sm:text-2xl md:text-display md:leading-[40px] font-medium tracking-wide whitespace-nowrap">
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
