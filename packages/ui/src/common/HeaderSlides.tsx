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
        {/* The band dissolves into the page rather than stopping at a line.
            The sheet below is `bg-surface`, so fading to the same token means
            the seam disappears instead of being covered by the sheet's lip. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-surface lg:h-16"
        />

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
          width={1231}
          height={839}
          priority
          className="pointer-events-none absolute -right-8 top-1/2 w-56 -translate-y-2/3 select-none md:w-72 lg:w-80"
        />

        {/* `relative` lifts the copy above the decoration behind it. The right
            padding reserves the mark's column so the headline cannot run under
            it; the echoes are free to sit behind text, which is what makes them
            read as echoes rather than a second logo.

            min-h is what holds the band open — its height used to come from the
            99px mark that sat in this row — and it steps up with the viewport.
            At one height for every width the band was 108px on a 27" display,
            which is what forced the lockup to crop so hard there. */}
        <div className="relative flex min-h-32 w-full max-w-full flex-col justify-center gap-3 px-4 pr-40 md:min-h-36 md:px-6 md:pr-48 lg:mx-auto lg:min-h-40 lg:max-w-5xl lg:px-8">
          <p className="text-brandInk text-body md:text-body-lg font-medium max-w-[250px] lg:max-w-[400px] w-full">
            {slideTexts[activeSlide]}
          </p>

          {/* In the flow under the headline, not pinned to the band's bottom
              edge. Pinned, they drifted away from the copy as the band grew and
              ended up sitting in the fade below. */}
          <div className="flex space-x-2">
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
    </div>
  );
};

export default HeaderSlides;
