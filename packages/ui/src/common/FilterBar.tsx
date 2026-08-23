"use client";

import { useState } from "react";
import SearchField from "../common/SearchField";

interface FilterBarProps {
    pills: string[];
    activePill: number;
    onPillChange: (index: number) => void;
    showSearch?: boolean;
    showSort?: boolean;
    onSearchClick?: () => void;
    onSortClick?: () => void;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    className?: string;
}

export default function FilterBar({
    pills,
    activePill,
    onPillChange,
    showSearch = true,
    showSort = true,
    onSearchClick,
    onSortClick,
    searchValue = "",
    onSearchChange,
    className = "",
}: FilterBarProps) {
    const [isSearchVisible, setIsSearchVisible] = useState(false);

    const handleSearchToggle = () => {
        setIsSearchVisible(!isSearchVisible);
        onSearchClick?.();
    };

    return (
        <div className={`w-full sticky top-0 bg-white z-sticky pb-2 ${className}`}>
            <div className="w-full flex">
                <div className="w-full flex flex-1 gap-2 items-center cursor-pointer overflow-x-scroll scrollbar-hide py-2">
                    {pills.map((pill, index) => (
                        <div
                            key={pill}
                            onClick={() => onPillChange(index)}
                            className={`px-2 text-body-sm py-2 rounded-full gap-2 flex items-center cursor-pointer whitespace-nowrap transition-colors ${activePill === index
                                ? "bg-black text-white"
                                : "bg-ink-3 text-black hover:bg-ink-5"
                                }`}
                        >
                            <span className="px-[2px] py-[1px]">
                                {pill}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-1 py-2">
                    {/* Search Icon */}
                    {showSearch && (
                        <div
                            onClick={handleSearchToggle}
                            className="cursor-pointer p-2 rounded-full hover:bg-ink-5 transition-colors"
                        >
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 20 20"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M17.5 17.5L13.875 13.875M15.8333 9.16667C15.8333 12.8486 12.8486 15.8333 9.16667 15.8333C5.48477 15.8333 2.5 12.8486 2.5 9.16667C2.5 5.48477 5.48477 2.5 9.16667 2.5C12.8486 2.5 15.8333 5.48477 15.8333 9.16667Z"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-ink-60"
                                />
                            </svg>
                        </div>
                    )}

                    {/* Sort Icon */}
                    {showSort && (
                        <div
                            onClick={onSortClick}
                            className="cursor-pointer p-2 rounded-full hover:bg-ink-5 transition-colors"
                        >
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 20 20"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M7.16683 4.24898C7.16683 3.97284 6.94297 3.74898 6.66683 3.74898C6.39069 3.74898 6.16683 3.97284 6.16683 4.24898L7.16683 4.24898ZM4.49837 14.4244L4.14324 14.7764H4.14324L4.49837 14.4244ZM3.68862 12.8971C3.49423 12.701 3.17766 12.6995 2.98152 12.8939C2.78539 13.0883 2.78398 13.4049 2.97837 13.601L3.68862 12.8971ZM15.502 5.57338L15.8571 5.22141L15.8571 5.22141L15.502 5.57338ZM16.3117 7.10067C16.5061 7.2968 16.8227 7.29821 17.0188 7.10383C17.2149 6.90944 17.2163 6.59286 17.022 6.39673L16.3117 7.10067ZM13.5424 4.09529L13.6056 3.5993V3.5993L13.5424 4.09529ZM12.8335 15.9157C12.8335 16.1918 13.0574 16.4157 13.3335 16.4157C13.6096 16.4157 13.8335 16.1918 13.8335 15.9157H12.8335ZM13.5002 4.09046L13.4497 4.58791L13.5002 4.09046ZM6.66683 15.7062H6.16683H6.66683ZM7.16683 15.7062L7.16683 4.24898L6.16683 4.24898L6.16683 15.7062H7.16683ZM4.8535 14.0724L3.68862 12.8971L2.97837 13.601L4.14324 14.7764L4.8535 14.0724ZM4.14324 14.7764C4.59945 15.2366 4.97081 15.6124 5.30114 15.8777C5.63935 16.1493 5.98265 16.3459 6.39472 16.3985L6.52116 15.4065C6.36711 15.3868 6.1951 15.3131 5.9273 15.098C5.65161 14.8766 5.32625 14.5494 4.8535 14.0724L4.14324 14.7764ZM15.1468 5.92536L16.3117 7.10067L17.022 6.39673L15.8571 5.22141L15.1468 5.92536ZM15.8571 5.22141C15.4009 4.76112 15.0295 4.38535 14.6992 4.12007C14.361 3.84845 14.0177 3.65183 13.6056 3.5993L13.4792 4.59128C13.6332 4.61091 13.8052 4.68469 14.073 4.89976C14.3487 5.12116 14.6741 5.44836 15.1468 5.92536L15.8571 5.22141ZM13.4497 4.58791C13.4595 4.58891 13.4694 4.59003 13.4792 4.59128L13.6056 3.5993C13.5873 3.59697 13.569 3.59487 13.5506 3.59301L13.4497 4.58791ZM12.8335 4.24898V15.9157H13.8335V4.24898H12.8335ZM13.5506 3.59301C13.1304 3.5504 12.8335 3.89588 12.8335 4.24898L13.8335 4.24899C13.8335 4.41768 13.6865 4.61192 13.4497 4.58791L13.5506 3.59301ZM6.16683 15.7062C6.16683 15.5658 6.29396 15.3775 6.52116 15.4065L6.39472 16.3985C6.85141 16.4567 7.16683 16.0779 7.16683 15.7062H6.16683Z"
                                    fill="currentColor"
                                    className="text-ink-60"
                                />
                            </svg>
                        </div>
                    )}
                </div>
            </div>

            {/* Inline Search Input - Now properly positioned */}
            {isSearchVisible && (
                <div className="pb-2 pt-1 border-t border-ink-10 bg-white">
                    <SearchField
                        value={searchValue ?? ""}
                        onChange={(value) => onSearchChange?.(value)}
                        placeholder="Search"
                    />
                </div>
            )}
        </div>
    );
}