"use client";
import Image from "next/image";
import { slidesData } from "./slidesData";

interface SlideContentProps {
  currentSlide: number;
  onSlideChange: (index: number) => void;
}

export default function SlideContent({ currentSlide, onSlideChange }: SlideContentProps) {
  return (
    <div className="relative -mt-18">
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
        <div className=" relative h-28 overflow-hidden">
          {slidesData.map((slide, index) => (
            <div
              key={`text-${index}`}
              className={`absolute w-full text-center transition-opacity duration-500 ${currentSlide === index ? "opacity-100" : "opacity-0"
                }`}>
              <h1 className="text-ink-90 text-lg md:text-display md:leading-[40px] font-medium tracking-wide whitespace-nowrap">
                {slide.title}
              </h1>
              <div className="mt-3 md:leading-[24px]">{slide.description}</div>
            </div>
          ))}
        </div>

        {/* Slide Indicators */}
        <div className="flex justify-center -mt-21 py-5 ">
          {slidesData.map((_, index) => (
            <button
              key={`indicator-${index}`}
              onClick={() => onSlideChange(index)}
              className={`h-[4px] rounded-full transition-all duration-300 ${currentSlide === index
                ? "w-[14px] bg-brand"
                : "w-[4px] bg-ink-10"
                }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
