import Link from "next/link";
import StepNavigation from "@vibaar/ui/common/StepNavigation";
import { HeaderProps } from "@/lib/types";
import SearchInput from "@/features/storefront/SearchInput";
import { useState } from "react";
import { Emergency } from "@vibaar/ui/svg";
import Image from 'next/image'
import IconButton from "@vibaar/ui/common/IconButton";
import { BiArrowBack, CiSearch, Menu, BsThreeDotsVertical, Bell } from "@vibaar/ui/icons";
export default function Header({
  showBack = false,
  showLogo = false,
  showSkip = false,
  showMenu = false,
  customText = "",
  showTab = false,
  tabs = [],
  activeTab,
  onTabChange,
  handleMenu,
  showPillBar = false,
  pillTabs = [],
  activePill,
  onPillChange,
  showStepNavigation = false,
  step = 0,
  logoDisplayCenter,
  totalSteps = 0,
  onBackClick,
  skipLink,
  searchComponent = false,
  showSearch = false,
  handleSearchClick,
  showInput = false,
  showEmer = false,
  isMenu = false,
  showNotification = false,
  notificationCount = 0,
  onNotificationClick,
}: HeaderProps) {
  const [searchTerm, setSearchTerm] = useState("");
  return (
    <div className="absolute lg:sticky lg:top-0 bg-white w-full flex flex-col z-sticky">
      {/* Desktop max-width wrapper */}
      <div className="w-full lg:max-w-5xl lg:mx-auto pt-3 pb-0 px-4 lg:px-5">
        <div
          className="flex flex-row items-center bg-white h-[36px]"
          style={{
            justifyContent: logoDisplayCenter ? "center" : "",
          }}>
        {/* Back Button */}
        {showBack && (
          <IconButton
            icon={BiArrowBack}
            label="Go back"
            onClick={onBackClick}
            className="mr-1 -ml-2"
          />
        )}
        {searchComponent === true && (
          <IconButton
            icon={CiSearch}
            label="Search"
            onClick={onBackClick}
            className="mr-1 -ml-2"
          />
        )}
        {showInput && (
          <SearchInput
            showArrow={true}
            onBackClick={handleSearchClick}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        )}

        {/* Logo */}
        {showLogo && (
          <div className="py-[1px]">
            <Image
              src="/brand/logo-black.svg"
              alt="Logo"
              width={135.5}
              height={39}
              className=""
            />
          </div>
        )}

        {/* Tabs */}
        {showTab && (
          <div className="flex  gap-4 mx-auto">
            {tabs.map((tab, index) => (
              <button
                key={tab}
                className={`px-4 pt-2 pb-1 ${index === activeTab
                  ? "border-b-2 border-ink-90 font-medium"
                  : "text-ink-40"
                  }`}
                onClick={() => onTabChange?.(index)}>
                {tab}
              </button>
            ))}
          </div>
        )}

        {/* Pill Bar (NEW VARIANT) */}
        {showPillBar && (
          <div className="w-full mt-2">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-2">
              {pillTabs.map((pill, index) => (
                <button
                  key={pill}
                  onClick={() => onPillChange?.(index)}
                  className={`px-4 py-2 rounded-full text-body-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors ${activePill === index
                    ? "bg-ink-90 text-white"
                    : "bg-ink-5 text-ink-60 hover:bg-ink-10"
                    }`}
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Text */}
        {customText && !showInput && (
          <h3 className="font-medium text-body-lg text-ink-90 ml-[0px] leading-[18px] flex-1 min-w-0 truncate">
            {customText}
          </h3>
        )}

        {/* Skip Link */}
        {showSkip && (
          <Link
            href={skipLink || ""}
            className="font-medium text-body text-brandDeep ml-auto">
            Skip
          </Link>
        )}

        {/* Notification bell */}
        {showNotification && (
          <div className="relative ml-auto">
            <IconButton icon={Bell} label="Notifications" onClick={onNotificationClick} />
            {notificationCount > 0 && (
              <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red text-white rounded-full flex items-center justify-center text-body-sm font-normal ring-1 ring-white z-10">
                {notificationCount > 99 ? "99+" : notificationCount}
              </div>
            )}
          </div>
        )}
        {/* Menu */}
        {showMenu && (
          <IconButton
            icon={isMenu ? Menu : BsThreeDotsVertical}
            label="Menu"
            onClick={handleMenu}
            className={showTab || showNotification ? "" : "ml-auto"}
          />
        )}

        {showSearch && (
          <IconButton
            icon={CiSearch}
            label="Search"
            onClick={handleSearchClick}
            className={showTab ? "" : "ml-auto"}
          />
        )}
        {showEmer && (
          <div
            // onClick={handleMenu}
            className="ml-auto cursor-pointer"
            style={{
              marginLeft: showTab ? 0 : "auto",
            }}>
            <Emergency />
          </div>
        )}
        </div>

        {/* Step Navigation */}
        {showStepNavigation && (
          <StepNavigation step={step} totalSteps={totalSteps} />
        )}
      </div>
    </div>
  );
}
