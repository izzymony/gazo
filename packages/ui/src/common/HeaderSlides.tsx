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
        <div className="w-full max-w-full lg:max-w-5xl lg:mx-auto flex justify-between items-center px-4 md:px-6 lg:px-8">
          <p className="text-brandInk text-body md:text-body-lg font-medium max-w-[250px] lg:max-w-[400px] w-full">
            {slideTexts[activeSlide]}
          </p>

          {/* The brand mark, in its discs.

              The mark was forty lines of inlined path data — and it was the OLD
              Instashop butterfly: byte-for-byte the geometry still sitting in
              the dead public/instashop.svg, with the old pink hex swapped for
              var(--brand). That swap is why the rebrand missed it and why no
              colour check ever caught it. Pointing at the brand asset means the
              next rebrand reaches this header for free.

              The discs are tonal rather than solid black. A filled black blob
              is the loudest thing on the buyer's first screen, and the seller
              hero already decorates its band the other way — pattern1.svg lays
              a dark neutral over the same yellow at 10%. Both sides match now. */}
          <div
            aria-hidden="true"
            className="relative -mr-4 flex-shrink-0 md:-mr-6 lg:-mr-8">
            <svg
              width="131"
              height="99"
              viewBox="0 0 99 69"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="block">
              <circle
                cx="79.9688"
                cy="45"
                r="79.9688"
                fill="rgb(var(--neutral-900-rgb))"
                fillOpacity="0.1"
              />
              <circle
                cx="79.9663"
                cy="44.9973"
                r="52.5989"
                fill="rgb(var(--neutral-900-rgb))"
                fillOpacity="0.1"
              />
            </svg>
            {/* Centred on the inner disc: its middle sits at (105.8, 64.6) in
                this 131x99 box, so a 44px mark starts 3px from the right edge
                and 48px down — both on the spacing scale. */}
            <Image
              src="/brand/icon-black.svg"
              alt=""
              width={44}
              height={34}
              priority
              className="pointer-events-none absolute right-1 top-12 w-11 select-none"
            />
          </div>
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
