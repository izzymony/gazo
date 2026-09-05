import { BusinessData } from "@/lib/types";
import useBusinessStore from "@/store/businessStore";
import { storePath } from "@/lib/urlHelpers";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import Loader from "@vibaar/ui/common/Loader";
import StoreLogo from "@vibaar/ui/common/StoreLogo";
import { trackSearch } from "@/lib/analytics";

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
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <mask
                  id="mask0_7921_55827"
                  maskUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width="20"
                  height="20">
                  <rect width="20" height="20" fill="#D9D9D9" />
                </mask>
                <g mask="url(#mask0_7921_55827)">
                  <path
                    d="M17.5 17.5L13.875 13.875M15.8333 9.16667C15.8333 12.8486 12.8486 15.8333 9.16667 15.8333C5.48477 15.8333 2.5 12.8486 2.5 9.16667C2.5 5.48477 5.48477 2.5 9.16667 2.5C12.8486 2.5 15.8333 5.48477 15.8333 9.16667Z"
                    stroke="white"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M17.5 17.5L13.875 13.875M15.8333 9.16667C15.8333 12.8486 12.8486 15.8333 9.16667 15.8333C5.48477 15.8333 2.5 12.8486 2.5 9.16667C2.5 5.48477 5.48477 2.5 9.16667 2.5C12.8486 2.5 15.8333 5.48477 15.8333 9.16667Z"
                    stroke="black"
                    strokeOpacity="0.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              </svg>
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
                className="text-black text-sm">
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
          <div className="text-sm font-medium tracking-[0.5px] leading-[14px] pt-3 pb-3">
            <p> Showing {filteredData?.length} vendors</p>
          </div>
        )}
      </div>

      {searchTerm && (
        <div className="p-2 absolute bg-surface z-40 shadow-sm w-full">
          {filteredData?.length > 0 ? (
            filteredData.map((store, index) => {
              const businessDetails = getBusinessDetail(stores, store.id || "");
              return (
                <div
                  onClick={() => {
                    setLoading(true);
                    router.push(storePath(businessDetails));
                  }}
                  className="mb-4 px-0 rounded-lg"
                  key={index}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 px-0 py-1">
                      <div>
                        <StoreLogo
                          src={businessDetails?.logo as string | undefined}
                          storeName={businessDetails?.name || "Store"}
                          size={52}
                          className=""
                        />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground-primary">
                          {businessDetails?.name}
                        </p>
                        <div className="flex gap-1 items-center">
                          <p className="font-normal text-body-sm text-foreground-muted">
                            {businessDetails?.category || "Fashion"}
                          </p>
                          <div className="font-normal text-body-sm flex gap-1 items-center text-foreground-muted">
                            <div>
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg">
                                <path
                                  d="M5.47982 1.37892C5.61427 1.10653 5.6815 0.970344 5.77276 0.926831C5.85216 0.888973 5.94441 0.888973 6.02381 0.926831C6.11507 0.970344 6.1823 1.10653 6.31675 1.37892L7.59231 3.96306C7.632 4.04348 7.65185 4.08368 7.68085 4.1149C7.70653 4.14254 7.73733 4.16494 7.77154 4.18084C7.81018 4.19881 7.85455 4.2053 7.94328 4.21827L10.7965 4.63531C11.097 4.67923 11.2472 4.70118 11.3167 4.77457C11.3772 4.83842 11.4057 4.92615 11.3942 5.01335C11.3809 5.11357 11.2722 5.2195 11.0546 5.43137L8.99079 7.44156C8.92645 7.50422 8.89428 7.53555 8.87352 7.57283C8.85515 7.60584 8.84336 7.64211 8.83881 7.67961C8.83367 7.72197 8.84126 7.76623 8.85644 7.85475L9.34342 10.694C9.39478 10.9935 9.42046 11.1433 9.3722 11.2321C9.33021 11.3094 9.25556 11.3636 9.16906 11.3797C9.06964 11.3981 8.93518 11.3274 8.66626 11.186L6.1155 9.84455C6.03602 9.80276 5.99628 9.78186 5.95442 9.77365C5.91735 9.76638 5.87922 9.76638 5.84215 9.77365C5.80029 9.78186 5.76055 9.80276 5.68107 9.84455L3.13031 11.186C2.86139 11.3274 2.72693 11.3981 2.62751 11.3797C2.54101 11.3636 2.46636 11.3094 2.42437 11.2321C2.37611 11.1433 2.40179 10.9935 2.45315 10.694L2.94012 7.85475C2.95531 7.76623 2.9629 7.72197 2.95776 7.67961C2.95321 7.64211 2.94142 7.60584 2.92304 7.57283C2.90229 7.53555 2.87012 7.50422 2.80578 7.44156L0.741934 5.43137C0.524411 5.2195 0.41565 5.11357 0.402415 5.01335C0.3909 4.92615 0.419348 4.83842 0.479838 4.77457C0.549362 4.70118 0.699591 4.67923 1.00005 4.63531L3.85329 4.21827C3.94202 4.2053 3.98639 4.19881 4.02503 4.18084C4.05924 4.16494 4.09004 4.14254 4.11572 4.1149C4.14472 4.08368 4.16457 4.04348 4.20426 3.96306L5.47982 1.37892Z"
                                  fill="white"
                                />
                                <path
                                  d="M5.47982 1.37892C5.61427 1.10653 5.6815 0.970344 5.77276 0.926831C5.85216 0.888973 5.94441 0.888973 6.02381 0.926831C6.11507 0.970344 6.1823 1.10653 6.31675 1.37892L7.59231 3.96306C7.632 4.04348 7.65185 4.08368 7.68085 4.1149C7.70653 4.14254 7.73733 4.16494 7.77154 4.18084C7.81018 4.19881 7.85455 4.2053 7.94328 4.21827L10.7965 4.63531C11.097 4.67923 11.2472 4.70118 11.3167 4.77457C11.3772 4.83842 11.4057 4.92615 11.3942 5.01335C11.3809 5.11357 11.2722 5.2195 11.0546 5.43137L8.99079 7.44156C8.92645 7.50422 8.89428 7.53555 8.87352 7.57283C8.85515 7.60584 8.84336 7.64211 8.83881 7.67961C8.83367 7.72197 8.84126 7.76623 8.85644 7.85475L9.34342 10.694C9.39478 10.9935 9.42046 11.1433 9.3722 11.2321C9.33021 11.3094 9.25556 11.3636 9.16906 11.3797C9.06964 11.3981 8.93518 11.3274 8.66626 11.186L6.1155 9.84455C6.03602 9.80276 5.99628 9.78186 5.95442 9.77365C5.91735 9.76638 5.87922 9.76638 5.84215 9.77365C5.80029 9.78186 5.76055 9.80276 5.68107 9.84455L3.13031 11.186C2.86139 11.3274 2.72693 11.3981 2.62751 11.3797C2.54101 11.3636 2.46636 11.3094 2.42437 11.2321C2.37611 11.1433 2.40179 10.9935 2.45315 10.694L2.94012 7.85475C2.95531 7.76623 2.9629 7.72197 2.95776 7.67961C2.95321 7.64211 2.94142 7.60584 2.92304 7.57283C2.90229 7.53555 2.87012 7.50422 2.80578 7.44156L0.741934 5.43137C0.524411 5.2195 0.41565 5.11357 0.402415 5.01335C0.3909 4.92615 0.419348 4.83842 0.479838 4.77457C0.549362 4.70118 0.699591 4.67923 1.00005 4.63531L3.85329 4.21827C3.94202 4.2053 3.98639 4.19881 4.02503 4.18084C4.05924 4.16494 4.09004 4.14254 4.11572 4.1149C4.14472 4.08368 4.16457 4.04348 4.20426 3.96306L5.47982 1.37892Z"
                                  fill="black"
                                  fillOpacity="0.9"
                                />
                              </svg>
                            </div>
                            {businessDetails?.rating || 4.5}{" "}
                            <div>
                              <svg
                                width="4"
                                height="5"
                                viewBox="0 0 4 5"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg">
                                <circle cx="2" cy="2.5" r="2" fill="white" />
                                <circle
                                  cx="2"
                                  cy="2.5"
                                  r="2"
                                  fill="black"
                                  fillOpacity="0.6"
                                />
                              </svg>
                            </div>
                            {businessDetails
                              ? businessDetails?.usersCount
                              : 100}
                            <div>
                              <svg
                                width="14"
                                height="15"
                                viewBox="0 0 14 15"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg">
                                <mask
                                  id="mask0_7036_247939"
                                  maskUnits="userSpaceOnUse"
                                  x="0"
                                  y="0"
                                  width="14"
                                  height="15">
                                  <rect
                                    y="0.5"
                                    width="14"
                                    height="14"
                                    fill="#D9D9D9"
                                  />
                                </mask>
                                <g mask="url(#mask0_7036_247939)">
                                  <path
                                    d="M10.506 9.73818C11.3553 10.1648 12.0834 10.8495 12.6149 11.7056C12.7201 11.8752 12.7728 11.9599 12.791 12.0773C12.8279 12.3159 12.6648 12.6091 12.4426 12.7035C12.3333 12.75 12.2103 12.75 11.9643 12.75M9.33934 7.22714C10.2037 6.7976 10.7977 5.90567 10.7977 4.875C10.7977 3.84433 10.2037 2.9524 9.33934 2.52286M8.17268 4.875C8.17268 6.32475 6.99742 7.5 5.54768 7.5C4.09793 7.5 2.92268 6.32475 2.92268 4.875C2.92268 3.42525 4.09793 2.25 5.54768 2.25C6.99742 2.25 8.17268 3.42525 8.17268 4.875ZM1.49889 11.5474C2.42891 10.151 3.89648 9.25 5.54767 9.25C7.19887 9.25 8.66645 10.151 9.59646 11.5474C9.8002 11.8533 9.90207 12.0062 9.89034 12.2016C9.88121 12.3538 9.78148 12.54 9.65992 12.6319C9.5038 12.75 9.28908 12.75 8.85963 12.75H2.23572C1.80627 12.75 1.59155 12.75 1.43543 12.6319C1.31387 12.54 1.21414 12.3538 1.20501 12.2016C1.19328 12.0062 1.29515 11.8533 1.49889 11.5474Z"
                                    stroke="white"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M10.506 9.73818C11.3553 10.1648 12.0834 10.8495 12.6149 11.7056C12.7201 11.8752 12.7728 11.9599 12.791 12.0773C12.8279 12.3159 12.6648 12.6091 12.4426 12.7035C12.3333 12.75 12.2103 12.75 11.9643 12.75M9.33934 7.22714C10.2037 6.7976 10.7977 5.90567 10.7977 4.875C10.7977 3.84433 10.2037 2.9524 9.33934 2.52286M8.17268 4.875C8.17268 6.32475 6.99742 7.5 5.54768 7.5C4.09793 7.5 2.92268 6.32475 2.92268 4.875C2.92268 3.42525 4.09793 2.25 5.54768 2.25C6.99742 2.25 8.17268 3.42525 8.17268 4.875ZM1.49889 11.5474C2.42891 10.151 3.89648 9.25 5.54767 9.25C7.19887 9.25 8.66645 10.151 9.59646 11.5474C9.8002 11.8533 9.90207 12.0062 9.89034 12.2016C9.88121 12.3538 9.78148 12.54 9.65992 12.6319C9.5038 12.75 9.28908 12.75 8.85963 12.75H2.23572C1.80627 12.75 1.59155 12.75 1.43543 12.6319C1.31387 12.54 1.21414 12.3538 1.20501 12.2016C1.19328 12.0062 1.29515 11.8533 1.49889 11.5474Z"
                                    stroke="black"
                                    strokeOpacity="0.9"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </g>
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <svg
                        width="16"
                        height="17"
                        viewBox="0 0 16 17"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg">
                        <mask
                          id="mask0_7921_86240"
                          maskUnits="userSpaceOnUse"
                          x="0"
                          y="0"
                          width="16"
                          height="17">
                          <rect y="0.5" width="16" height="16" fill="#D9D9D9" />
                        </mask>
                        <g mask="url(#mask0_7921_86240)">
                          <path
                            d="M8.93333 8.50026L4.23333 3.80026C4.07778 3.6447 4 3.45582 4 3.23359C4 3.01137 4.07778 2.82248 4.23333 2.66693C4.38889 2.51137 4.57778 2.43359 4.8 2.43359C5.02222 2.43359 5.21111 2.51137 5.36667 2.66693L10.35 7.65026C10.4722 7.77248 10.5611 7.90582 10.6167 8.05026C10.6722 8.19471 10.7 8.34471 10.7 8.50026C10.7 8.65582 10.6722 8.80582 10.6167 8.95026C10.5611 9.09471 10.4722 9.22804 10.35 9.35026L5.36667 14.3336C5.21111 14.4891 5.02222 14.5669 4.8 14.5669C4.57778 14.5669 4.38889 14.4891 4.23333 14.3336C4.07778 14.178 4 13.9892 4 13.7669C4 13.5447 4.07778 13.3558 4.23333 13.2003L8.93333 8.50026Z"
                            fill="var(--brand)"
                          />
                        </g>
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-sm text-black">No vendors found</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchInput;
