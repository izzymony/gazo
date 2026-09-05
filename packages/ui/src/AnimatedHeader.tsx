/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";

interface ImageProps {
  src: string;
  width: number;
  height: number;
  position?: { x: number; y: number };
  animation?: {
    floatHeight?: number;
    floatDuration?: number;
  };
}

interface Slide {
  background: string;
  images: ImageProps[];
  title: string;
  description: any;
}

export default function AnimatedHeader() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const containerRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Initialize refs array
  useEffect(() => {
    containerRefs.current = Array(3).fill(null);
  }, []);

  const slides: Slide[] = [
    {
      background: "/Frame 1618869220.png",
      images: [
        {
          src: "/Frame 1618869207.webp",
          width: 145,
          height: 41,
          position: { x: -110, y: -40 },
          animation: { floatHeight: 10, floatDuration: 4000 },
        },
        {
          src: "/Frame 1618869205.svg",
          width: 155,
          height: 41,
          position: { x: -110, y: 60 },
          animation: { floatHeight: 15, floatDuration: 4500 },
        },
        {
          src: "/Frame 1618869208 (1).svg",
          width: 166,
          height: 41,
          position: { x: 110, y: 10 },
          animation: { floatHeight: 8, floatDuration: 3800 },
        },
        {
          src: "/Frame 1618869209.svg",
          width: 152,
          height: 41,
          position: { x: 110, y: 90 },
          animation: { floatHeight: 12, floatDuration: 4200 },
        },
      ],
      title: "Sell More. Grow Faster.",
      description: (
        <p className="text-xs text-foreground-primary">
          Transform your IG or TikTok into a smart storefront. <br />
          Payments, delivery & insights—all in one place.
        </p>
      ),
    },
    {
      background: "/Frame 1618869221.png",
      images: [
        {
          src: "/Frame 1618869215.svg",
          width: 145,
          height: 41,
          position: { x: 110, y: 85 },
        },
        {
          src: "/Frame 1618869216.webp",
          width: 155,
          height: 41,
          position: { x: -110, y: 20 },
        },
        {
          src: "/Frame 1618869214.webp",
          width: 130,
          height: 41,
          position: { x: 110, y: -40 },
        },
      ],
      title: "Shop safer, without fear.",
      description: (
        <p className="text-xs text-foreground-primary">
          Discover trusted vendors with secure checkout, <br />
          refund support, and verified ratings.
        </p>
      ),
    },
    {
      background: "/Frame 1618869222.webp",
      images: [
        {
          src: "/Frame 1618869023.svg",
          width: 145,
          height: 41,
          position: { x: -115, y: -20 },
        },
        {
          src: "/Frame 1618869141.svg",
          width: 155,
          height: 41,
          position: { x: 110, y: 80 },
        },
      ],
      title: "Track Every Order Instantly.",
      description: (
        <p className="text-xs text-foreground-primary">
          Real-time delivery tracking and fast, affordable <br />
          shipping — no more stress
        </p>
      ),
    },
  ];

  const animateSlide = useCallback(
    (container: HTMLDivElement | null, index: number) => {
      if (!container) return;

      const elements = Array.from(container.children) as HTMLElement[];
      const currentSlide = slides[index];

      const gather = () => {
        elements.forEach((el) => {
          el.style.transition = "transform 1s cubic-bezier(0.16, 1, 0.3, 1)";
          el.style.transform = "translate(0, 0)";
        });
      };

      const spread = () => {
        elements.forEach((el, idx) => {
          const img = currentSlide.images[idx];
          if (img.position) {
            const { x, y } = img.position;
            el.style.transition =
              "transform 1.8s cubic-bezier(0.16, 1, 0.3, 1)";
            el.style.transform = `translate(${x}px, ${y}px)`;
          }
        });
      };

      const startFloating = () => {
        elements.forEach((el, idx) => {
          const img = currentSlide.images[idx];
          const currentTransform = el.style.transform || "translate(0, 0)";
          const floatHeight = img.animation?.floatHeight ?? 10;
          const floatDuration = img.animation?.floatDuration ?? 4000;

          el.animate(
            [
              { transform: `${currentTransform} translateY(0px)` },
              {
                transform: `${currentTransform} translateY(-${floatHeight}px)`,
              },
              { transform: `${currentTransform} translateY(0px)` },
            ],
            {
              duration: floatDuration,
              iterations: Infinity,
              easing: "cubic-bezier(0.5, 0, 0.5, 1)",
              direction: "alternate",
            }
          );
        });
      };

      gather();
      const spreadTimeout = setTimeout(() => {
        spread();
        setTimeout(startFloating, 1800);
      }, 800);

      return () => clearTimeout(spreadTimeout);
    },
    [slides]
  );

  // Animation setup on mount and slide change
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 8000);

    return () => {
      clearInterval(interval);
      containerRefs.current.forEach((ref) => {
        if (ref) {
          const elements = Array.from(ref.children) as HTMLElement[];
          elements.forEach((el) =>
            el.getAnimations().forEach((anim) => anim.cancel())
          );
        }
      });
    };
  }, [slides.length]);

  useEffect(() => {
    if (containerRefs.current[currentSlide]) {
      animateSlide(containerRefs.current[currentSlide], currentSlide);
    }
  }, [currentSlide, animateSlide]);

  // Stable ref callback
  const setContainerRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      containerRefs.current[index] = el;
    },
    []
  );

  return (
    <div className="h-full ">
      <header className="relative h-full w-full overflow-hidden">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity ease-in-out ${currentSlide === index
              ? "opacity-100"
              : "opacity-0 pointer-events-none"
              }`}>
            <div className="relative w-full h-full">
              {/* For screens >= 640px (md) */}
              <Image
                src={slide.background}
                fill
                alt={`Slide ${index + 1} background`}
                priority
                className="z-0 top-0 absolute object-cover hidden sm:block"
              // sizes="(max-width: 768px) 100vw, 360px"
              />

              {/* For screens < 640px (mobile) */}
              <Image
                src={slide.background}
                width={640}
              height={184} // Optimized height for mobile layout
                alt={`Slide ${index + 1} background`}
                priority
                className="z-0 w-full h-full object-cover sm:hidden"
                sizes="100vw"
              />
              <div className=" absolute -bottom-0 left-0 right-0 h-[calc(3rem+1px)] bg-gradient-to-t mt-3 from-white via-white/10 to-transparent backdrop-blur-[1px] z-20" />            </div>
            {/*  <div
              className="absolute inset-0 pointer-events-none rounded-lg z-10"
              style={{
                WebkitMaskImage:
                  "radial-gradient(circle at 50% 50%, transparent 100px, black 250px)",
                maskImage:
                  "radial-gradient(circle at 50% 50%, transparent 100px, black 250px)",

                backdropFilter: "blur(30px)",
                WebkitBackdropFilter: "blur(30px)",
                filter: "blur(30px)",
              }}
            /> */}

            <Image
              src="/brand/logo-white.svg"
              alt="Company Logo"
              width={150}
              height={43}
              className=" mx-auto z-20 absolute top-16 left-1/2 transform -translate-x-1/2 -translate-y-1/3"
              priority
            />
            {/*  <div className="absolute top-1/2 left-1/2 w-full h-full py-4 transform -translate-x-1/2 -translate-y-1/2 border-[38px] border-white opacity-10 rounded-lg pointer-events-none z-10" /> */}


            <div
              ref={setContainerRef(index)}
              className="absolute top-1/2 left-1/2 w-[250px] h-[250x] transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-30 p-3">
              {slide.images.map((img, idx) => (
                <div
                  key={`img-${index}-${idx}`}
                  className="absolute will-change-transform"
                  style={{
                    transition: "transform 1.8s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}>
                  <Image
                    src={img.src}
                    width={img.width}
                    height={img.height}
                    alt={`Slide ${index + 1} icon ${idx + 1}`}
                    priority
                    className="-mt-4"
                  />
                </div>
              ))}
            </div>

          </div>
        ))}

        {/* <div
          className="absolute -top-10 h-[200px] bg-white/90 backdrop-blur-xl rounded-xl -z-10"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
            boxShadow: "0 4px 30px rgba(0, 0, 0, 0.05)",
          }}
        />   */}

        <div className=" absolute -bottom-12 left-0 right-0 h-[calc(6rem+1rem)] bg-gradient-to-t mt-3 from-white via-white/70 to-transparent backdrop-blur-[1px] z-20" />

      </header>


      <div className="relative z-20 mt-3 sm:mt-7 px-4 space-y-2">

        <div className="relative h-16 sm:h-32 overflow-hidden">
          {slides.map((slide, index) => (
            <div
              key={`text-${index}`}
              className={`absolute w-full text-center transition-opacity duration-500 ${currentSlide === index ? "opacity-100" : "opacity-0"
                }`}>
              <h1 className="text-foreground-primary text-lg sm:text-2xl font-medium tracking-wider mb-1 sm:mb-2">
                {slide.title}
              </h1>
              {slide.description}
            </div>
          ))}
        </div>

        <div className="absolute left-1/2 transform -translate-x-1/2 flex gap-3 z-30 -mt-4 sm:-mt-10">
          {slides.map((_, index) => (
            <button
              key={`indicator-${index}`}
              onClick={() => setCurrentSlide(index)}
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
