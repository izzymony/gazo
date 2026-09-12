/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import { useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { slidesData } from "./slidesData";

interface AnimatedImagesProps {
  currentSlide: number;
}

export default function AnimatedImages({ currentSlide }: AnimatedImagesProps) {
  const containerRefs = useRef<(HTMLDivElement | null)[]>([]);

  const animateSlide = useCallback(
    (container: HTMLDivElement | null, index: number) => {
      if (!container) return;

      const elements = Array.from(container.children) as HTMLElement[];
      const slide = slidesData[index];

      const gather = () => {
        elements.forEach((el) => {
          el.style.transition = "transform 1s cubic-bezier(0.16, 1, 0.3, 1)";
          el.style.transform = "translate(0, 0)";
        });
      };

      const spread = () => {
        elements.forEach((el, idx) => {
          const img = slide.images[idx];
          // Use desktop position if available and screen is >= 768px (md breakpoint)
          const isDesktop = window.innerWidth >= 768;
          const position = isDesktop && img.desktopPosition
            ? img.desktopPosition
            : img.position;

          if (position) {
            const { x, y } = position;
            el.style.transition =
              "transform 1.8s cubic-bezier(0.16, 1, 0.3, 1)";
            el.style.transform = `translate(${x}px, ${y}px)`;
          }
        });
      };

      const startFloating = () => {
        elements.forEach((el, idx) => {
          const img = slide.images[idx];
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
    []
  );

  useEffect(() => {
    // Returning animateSlide's own cleanup matters: it clears the pending
    // spread timeout, which otherwise fires against a detached element.
    return animateSlide(containerRefs.current[currentSlide], currentSlide);
  }, [currentSlide, animateSlide]);

  useEffect(() => {
    return () => {
      containerRefs.current.forEach((ref) => {
        if (ref) {
          const elements = Array.from(ref.children) as HTMLElement[];
          elements.forEach((el) =>
            el.getAnimations().forEach((anim) => anim.cancel())
          );
        }
      });
    };
  }, []);

  // Stable ref callback
  const setContainerRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      containerRefs.current[index] = el;
    },
    []
  );

  return (
    <div className="h-full w-full">
      <header className="relative h-full w-full overflow-hidden">
        {slidesData.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity ease-in-out ${
              currentSlide === index
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}>
            <div className="relative w-full h-full">
              {/* Background Image */}
              <Image
                src={slide.background}
                fill
                alt={`Slide ${index + 1} background`}
                priority
                className="z-0 top-0 absolute object-cover"
              />

              {/* Mobile Logo */}
              <Image
                src="/brand/logo-white.svg"
                alt="Company Logo"
                width={150}
              height={43}
                className="mx-auto z-20 absolute top-16 left-1/2 transform -translate-x-1/2 -translate-y-1/3 md:hidden"
                priority
              />

              {/* Floating Icons */}
              <div
                ref={setContainerRef(index)}
                className="absolute top-1/2 left-1/2 w-[250px] h-[250px] md:w-[450px] md:h-[450px] transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-30 p-3">
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
                      className="-mt-4 md:mt-6"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Mobile bottom gradient */}
        <div className="absolute -bottom-12 left-0 right-0 h-[calc(6rem+1rem)] bg-gradient-to-t mt-3 from-white via-white/70 to-transparent backdrop-blur-[1px] z-20 md:hidden" />
      </header>
    </div>
  );
}
