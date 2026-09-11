import { BusinessData } from "@/lib/types";
import useBusinessStore from "@/store/businessStore";
import { storePath } from "@/lib/urlHelpers";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import Loader from "@vibaar/ui/common/Loader";
import StoreLogo from "@vibaar/ui/common/StoreLogo";
import { trackSearch } from "@/lib/analytics";
import { CiSearch, FaStar, FiUsers, ChevronRight } from "@vibaar/ui/icons";

// Add this helper function before the SearchInput component
const getBusinessDetail = (stores: BusinessData[], id: string) => {
  return stores.find((store) => store.id === id);
};

const SearchInput = ({
  searchTerm,
  setSearchTerm,
  onBackClick,
  showSearch,
  showArrow,
  action,
}: {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  onBackClick?: () => void;
  showSearch?: boolean;
  showArrow?: boolean;
  action?: () => void;
}) => {
  const router = useRouter();
  // const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const { stores } = useBusinessStore();
  // Filter the grouped data based on the search term
  const filteredData = searchTerm
    ? stores.filter((store) =>
        store?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const [loading, setLoading] = useState(false);
  const searchTrackingTimeout = useRef<NodeJS.Timeout | null>(null);

  // Track search with debounce (500ms after user stops typing)
  useEffect(() => {
    if (searchTrackingTimeout.current) {
      clearTimeout(searchTrackingTimeout.current);
    }

    if (searchTerm && searchTerm.length >= 2) {
      searchTrackingTimeout.current = setTimeout(() => {
        trackSearch(searchTerm, filteredData.length);
      }, 500);
    }

    return () => {
      if (searchTrackingTimeout.current) {
        clearTimeout(searchTrackingTimeout.current);
      }
    };
  }, [searchTerm, filteredData.length]);

  if (loading) return <Loader />;

  return (
    <div className="w-full relative bg-surface z-50">
      <div className="mt-2 space-y-3">
        <div
          className={searchTerm ? "w-full py-2 border-b" : "w-full pt-2 pb-1"}>
          <div className="flex items-center rounded-full px-2 py-2 shadow-sm w-full border gap-2">
            {showArrow && (
              <button
                type="button"
                onClick={onBackClick}
                className="text-brandDeep mr-2">
                <Image
                  src="/images/arrow-back.svg"
                  alt="Arrow back"
                  width={12}
                  height={12}
                />
              </button>
            )}
            {showSearch && (
              <CiSearch size={20} className="shrink-0 text-foreground-muted" aria-hidden="true" />
            )}
            <input
              type="text"
              placeholder="Enter a vendor name"
              className="w-full outline-none text-sm text-foreground-secondary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm.trim()) {
                  // Trigger search on Enter
                  e.preventDefault();
                  // Focus on first search result if available
                  if (filteredData.length > 0) {
                    setLoading(true);
                    const firstStore = getBusinessDetail(stores, filteredData[0].id || "");
                    if (firstStore) {
                      router.push(storePath(firstStore));
                    }
                  }
                }
              }}
              inputMode="search" // Better mobile keyboard with search button
            />
            {searchTerm && showArrow && (
              <button
                type="button"
                onClick={action ? action : () => setSearchTerm("")}
                aria-label="Clear search"
                className="text-black text-sm rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandDeep/40 focus-visible:ring-offset-1">
                X
              </button>
            )}
            {searchTerm && showSearch && (
              <button
                type="button"
                onClick={action ? action : () => setSearchTerm("")}
                className="text-foreground-secondary text-sm">
                Clear
              </button>
            )}
          </div>
        </div>
        {searchTerm && (
          <p className="py-3 text-body-sm font-medium text-foreground-secondary">
            Showing {filteredData?.length} vendors
          </p>
        )}
      </div>

      {searchTerm && (
        <div className="p-2 absolute bg-surface z-40 shadow-sm w-full">
          {filteredData?.length > 0 ? (
            filteredData.map((store, index) => {
              const businessDetails = getBusinessDetail(stores, store.id || "");
              return (
                <Link
                  href={storePath(businessDetails)}
                  onClick={() => setLoading(true)}
                  className="mb-2 flex items-center justify-between gap-3 rounded-field px-2 py-2 hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandDeep/40"
                  key={index}>
                  <span className="flex min-w-0 items-center gap-3">
                    <StoreLogo
                      src={businessDetails?.logo as string | undefined}
                      storeName={businessDetails?.name || "Store"}
                      size={44}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-body font-medium text-foreground-primary">
                        {businessDetails?.name}
                      </span>
                      {/* Real values only. This row used to show `rating || 4.5`
                          and `usersCount ?? 100` — a vendor with no ratings and
                          no followers was presented as 4.5 stars with 100
                          followers, and the two glyphs beside them were 40 lines
                          of masked inline SVG each. */}
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-body-sm font-normal text-foreground-muted">
                        {businessDetails?.category && (
                          <span className="truncate">{businessDetails.category}</span>
                        )}
                        {Number(businessDetails?.average_rating) > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1">
                              <FaStar size={12} className="text-brandDeep" aria-hidden="true" />
                              {Number(businessDetails?.average_rating).toFixed(1)}
                            </span>
                          </>
                        )}
                        {Number(businessDetails?.followers_count) > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1">
                              <FiUsers size={12} aria-hidden="true" />
                              {businessDetails?.followers_count}
                            </span>
                          </>
                        )}
                      </span>
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-brandDeep" aria-hidden="true" />
                </Link>
              );
            })
          ) : (
            <p className="py-4 text-center text-body-sm text-foreground-muted">No vendors found</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchInput;
