/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import { useState, useEffect } from "react";

const HeaderSlides = () => {
  const [activeSlide, setActiveSlide] = useState<number>(0);

  // Array of slide texts
  const slideTexts = [
    "One stop platform for all your social media shopping",
    "Shop directly from your favorite social media accounts",
    "Fast, reliable, and secure shopping experience",
    "Connecting you to the best social media deals",
  ];

  // Auto slide every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slideTexts.length);
    }, 3000);
    return () => clearInterval(interval); // Clean up the interval on component unmount
  }, []);

  // Function to change slide when dot is clicked
  const handleDotClick = (index: number): void => {
    setActiveSlide(index);
  };

  return (
    <div className="relative">
      {/* Slider Content */}
      <div className="relative bg-brand pb-3 flex justify-between items-center transition-all duration-500 ease-in-out overflow-hidden">
        {/* The mark, as the three-layer lockup the brand uses: two echoes
            behind it, then the mark in brand yellow with a black outline. All
            three live in ONE asset (brand/icon-stack.svg) built from the same
            paths, so the layering can't drift out of register the way three
            stacked images did.

            Anchored to the BAND, which is full-bleed, and NOT to the max-w-5xl
            content column. Inside the column its right edge landed mid-viewport
            on desktop and drew a hard vertical seam across the band; out here
            it runs off the real screen edge instead.

            What it replaced: forty lines of inlined path data that were the OLD
            Instashop butterfly — the geometry still sitting in the dead
            public/instashop.svg, recoloured from the old pink to var(--brand).
            A recolour, not a replacement, which is why the rebrand missed it
            and no colour gate ever flagged it. */}
        <Image
          src="/brand/icon-stack.svg"
          alt=""
          aria-hidden="true"
          width={1318}
          height={1100}
          priority
          className="pointer-events-none absolute -right-8 top-1/2 w-40 -translate-y-1/2 select-none md:w-44 lg:w-48"
        />

        {/* `relative` lifts the copy above the decoration behind it. The right
            padding reserves the mark's column so the headline cannot run under
            it; the echoes are free to sit behind text, which is what makes them
            read as echoes rather than a second logo. min-h holds the band open:
            its height used to come from the 99px mark that sat in this row. */}
        <div className="relative flex min-h-24 w-full max-w-full items-center justify-between px-4 pr-28 md:px-6 md:pr-36 lg:mx-auto lg:max-w-5xl lg:px-8">
          <p className="text-brandInk text-body md:text-body-lg font-medium max-w-[250px] lg:max-w-[400px] w-full">
            {slideTexts[activeSlide]}
          </p>
        </div>
      </div>

      {/* Dots for navigation */}
      <div className="absolute bottom-4 left-0 w-full">
        <div className="w-full max-w-full lg:max-w-5xl lg:mx-auto px-4 md:px-6 lg:px-8 flex space-x-2 mb-2">
        {slideTexts.map((_, index) => (
          <div
            key={index}
            onClick={() => handleDotClick(index)}
            className={`w-[6px] h-[6px] rounded-full cursor-pointer ${index === activeSlide ? "bg-brandInk/70" : "bg-brandInk/25"
              }`}
          />
        ))}
        </div>
      </div>
    </div>
  );
};

export default HeaderSlides;
