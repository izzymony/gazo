"use client";

import { useState } from "react";
import Header from "@vibaar/ui/common/Header";
import IconButton from "@vibaar/ui/common/IconButton";
import { CiSearch } from "@vibaar/ui/icons";
import SearchInput from "@/features/storefront/SearchInput";
import Footer from "@vibaar/ui/common/Footer";
import { MainLayoutProps } from "@/lib/types";
import Image from "next/image";

/**
 * LEGACY, one caller left: app/(buyer)/shop/spotlights. Not to be adopted —
 * `PageShell` is the systematic page layout, and retiring this file with its last
 * importer is tracked separately as R4.
 *
 * ITS TWO ACTION BARS ARE GONE. Both were
 * `fixed bottom-0 left-0 right-0 ... lg:max-w-5xl lg:mx-auto`: a page-wide CTA
 * bar pinned to the viewport floor at every width, which is precisely what the
 * desktop rule forbids. They were also duplicated — the `staticContent` branch
 * and the default branch each carried a byte-identical copy — so any fix to one
 * silently missed the other.
 *
 * Removing them is behaviour-neutral and that is checkable rather than hopeful:
 * both sat behind `showBtn`, and the single remaining caller passes `headerProps`
 * and nothing else. Neither bar has been reachable in the running app.
 *
 * Thirteen props existed only to fill those bars and are gone with them:
 * buttonText, btnClass, onClickBtn, buttonType, isButtonLoading, showBtn,
 * showBeforeBtn, beforeButtonContent, afterButtonContent, showDivider,
 * secondaryText, secondaryLink, otpCheckMailNotification. A future caller cannot
 * now ask this layout for a fixed CTA bar, which is the point — deleting the
 * markup without deleting the props would leave the invitation standing.
 *
 * `pb-[100px]` went with them: it existed to clear a bar that can no longer
 * render, and left 100px of dead scroll at the foot of the one live screen.
 */
export default function MainLayout({
  children,
  headerProps,
  staticContent = false,
  showFooter = false,
  imgSrc,
  addSpace = false,
}: MainLayoutProps) {
  // The search term used to live inside Header itself, which is why Header —
  // a design-system component — imported an app feature. The state belongs
  // with the composition that needs it, not in the shared primitive.
  const [searchTerm, setSearchTerm] = useState("");
  return (
    <>
      {/* The one caller (shop/spotlights) toggles the title out for a search
          field. That behaviour is composed here from Header's slots rather than
          living behind showSearch/showInput flags inside Header. */}
      {headerProps && (
        <Header
          onBack={headerProps.showBack ? headerProps.onBackClick : undefined}
          leading={
            headerProps.showInput ? (
              <SearchInput
                showArrow
                onBackClick={headerProps.handleSearchClick}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
              />
            ) : undefined
          }
          title={headerProps.showInput ? undefined : headerProps.customText}
          trailing={
            headerProps.showSearch ? (
              <IconButton
                icon={CiSearch}
                label="Search"
                onClick={headerProps.handleSearchClick}
              />
            ) : undefined
          }
        />
      )}
      <div
        className={
          headerProps
            ? "flex flex-col w-full max-w-full lg:max-w-5xl lg:mx-auto h-full lg:mt-3"
            : "flex flex-col w-full max-w-full lg:max-w-5xl lg:mx-auto h-full"
        }>
        {staticContent ? (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {children}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <main className="flex-1 overflow-y-auto scrollbar-hide mt-2.5">
              {/* Centered Image */}
              <div className="flex flex-col items-center justify-center ">
                {addSpace && <div className="mt-[120px]" />}
                {imgSrc && (
                  <div className="max-w-[296px] mt-[90px] mb-5">
                    <Image
                      src={imgSrc}
                      alt="Welcome"
                      width={"0"}
                      height={"0"}
                      className="w-auto h-auto"
                    />
                  </div>
                )}
              </div>
              {children}
            </main>
          </div>
        )}
      </div>

      {/* Conditionally render Footer */}
      {showFooter && <Footer />}
    </>
  );
}
