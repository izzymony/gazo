/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
import React from "react";
import EmptyState from "@/design-system/common/EmptyState";
import Button from "@/design-system/common/Button";
import { useRouter } from "next/navigation";

const Reviewed = () => {
  const comment =
    "this is a review message to the vendor i met  on this platform";
  const data: any[] = [];
  const router = useRouter();
  return (
    <div className="gap-4 flex flex-col">
      {data.length > 0 ? (
        data.map((item) => (
          <div key={item} className="px-4 gap-2 flex flex-col">
            <div className="flex justify-between w-full">
              <div className="flex gap-1 flex-1">
                <img
                  src={"/images/vendor/vendorDefaultbg.png"}
                  alt="review"
                  className="w-12 h-12 rounded-lg border border-ink-5 object-cover"
                />
                <div>
                  <div className="flex items-center mb-1">
                    {[1, 2, 3, 4, 5].map((item) => (
                      <svg
                        key={item}
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg">
                        <mask
                          id="mask0_7965_7826"
                          maskUnits="userSpaceOnUse"
                          x="0"
                          y="0"
                          width="14"
                          height="14">
                          <rect width="14" height="14" fill="#D9D9D9" />
                        </mask>
                        <g mask="url(#mask0_7965_7826)">
                          <path
                            d="M6.47982 1.88087C6.61427 1.60849 6.6815 1.4723 6.77276 1.42878C6.85216 1.39093 6.94441 1.39093 7.02381 1.42878C7.11507 1.4723 7.1823 1.60849 7.31675 1.88087L8.59231 4.46502C8.632 4.54543 8.65185 4.58564 8.68085 4.61685C8.70653 4.64449 8.73733 4.66689 8.77154 4.6828C8.81018 4.70077 8.85455 4.70725 8.94328 4.72022L11.7965 5.13726C12.097 5.18118 12.2472 5.20314 12.3167 5.27652C12.3772 5.34037 12.4057 5.42811 12.3942 5.5153C12.3809 5.61552 12.2722 5.72146 12.0546 5.93332L9.99079 7.94351C9.92645 8.00618 9.89428 8.03751 9.87352 8.07479C9.85515 8.1078 9.84336 8.14406 9.83881 8.18156C9.83367 8.22392 9.84126 8.26818 9.85644 8.3567L10.3434 11.196C10.3948 11.4955 10.4205 11.6452 10.3722 11.7341C10.3302 11.8114 10.2556 11.8656 10.1691 11.8816C10.0696 11.9001 9.93518 11.8293 9.66626 11.6879L7.1155 10.3465C7.03602 10.3047 6.99628 10.2838 6.95442 10.2756C6.91735 10.2683 6.87922 10.2683 6.84215 10.2756C6.80029 10.2838 6.76055 10.3047 6.68107 10.3465L4.13031 11.6879C3.86139 11.8293 3.72693 11.9001 3.62751 11.8816C3.54101 11.8656 3.46636 11.8114 3.42437 11.7341C3.37611 11.6452 3.40179 11.4955 3.45315 11.196L3.94012 8.3567C3.95531 8.26818 3.9629 8.22392 3.95776 8.18156C3.95321 8.14406 3.94142 8.1078 3.92304 8.07479C3.90229 8.03751 3.87012 8.00618 3.80578 7.94351L1.74193 5.93332C1.52441 5.72146 1.41565 5.61552 1.40242 5.5153C1.3909 5.42811 1.41935 5.34037 1.47984 5.27652C1.54936 5.20314 1.69959 5.18118 2.00005 5.13726L4.85329 4.72022C4.94202 4.70725 4.98639 4.70077 5.02503 4.6828C5.05924 4.66689 5.09004 4.64449 5.11572 4.61685C5.14472 4.58564 5.16457 4.54543 5.20426 4.46502L6.47982 1.88087Z"
                            fill="white"
                          />
                          <path
                            d="M6.47982 1.88087C6.61427 1.60849 6.6815 1.4723 6.77276 1.42878C6.85216 1.39093 6.94441 1.39093 7.02381 1.42878C7.11507 1.4723 7.1823 1.60849 7.31675 1.88087L8.59231 4.46502C8.632 4.54543 8.65185 4.58564 8.68085 4.61685C8.70653 4.64449 8.73733 4.66689 8.77154 4.6828C8.81018 4.70077 8.85455 4.70725 8.94328 4.72022L11.7965 5.13726C12.097 5.18118 12.2472 5.20314 12.3167 5.27652C12.3772 5.34037 12.4057 5.42811 12.3942 5.5153C12.3809 5.61552 12.2722 5.72146 12.0546 5.93332L9.99079 7.94351C9.92645 8.00618 9.89428 8.03751 9.87352 8.07479C9.85515 8.1078 9.84336 8.14406 9.83881 8.18156C9.83367 8.22392 9.84126 8.26818 9.85644 8.3567L10.3434 11.196C10.3948 11.4955 10.4205 11.6452 10.3722 11.7341C10.3302 11.8114 10.2556 11.8656 10.1691 11.8816C10.0696 11.9001 9.93518 11.8293 9.66626 11.6879L7.1155 10.3465C7.03602 10.3047 6.99628 10.2838 6.95442 10.2756C6.91735 10.2683 6.87922 10.2683 6.84215 10.2756C6.80029 10.2838 6.76055 10.3047 6.68107 10.3465L4.13031 11.6879C3.86139 11.8293 3.72693 11.9001 3.62751 11.8816C3.54101 11.8656 3.46636 11.8114 3.42437 11.7341C3.37611 11.6452 3.40179 11.4955 3.45315 11.196L3.94012 8.3567C3.95531 8.26818 3.9629 8.22392 3.95776 8.18156C3.95321 8.14406 3.94142 8.1078 3.92304 8.07479C3.90229 8.03751 3.87012 8.00618 3.80578 7.94351L1.74193 5.93332C1.52441 5.72146 1.41565 5.61552 1.40242 5.5153C1.3909 5.42811 1.41935 5.34037 1.47984 5.27652C1.54936 5.20314 1.69959 5.18118 2.00005 5.13726L4.85329 4.72022C4.94202 4.70725 4.98639 4.70077 5.02503 4.6828C5.05924 4.66689 5.09004 4.64449 5.11572 4.61685C5.14472 4.58564 5.16457 4.54543 5.20426 4.46502L6.47982 1.88087Z"
                            fill="black"
                            fill-opacity="0.9"
                          />
                        </g>
                      </svg>
                    ))}
                  </div>
                  <p className="text-caption text-ink-40 tracking-[0.5px] font-medium">
                    Gucci Store
                  </p>
                  <p className="text-caption text-ink-40 tracking-[0.5px] font-medium">
                    Product name goes here
                  </p>
                </div>
              </div>
              <div className="flex flex-col justify-between">
                <p className="text-caption text-ink-40 tracking-[0.5px] font-normal">
                  Mon, 23/04/2024
                </p>
                <div className="border-ink-30 border rounded px-2 py-[3px] bg-ink-3 text-caption text-[#000000] tracking-[0.5px] font-normal">
                  Bought White, M
                </div>
              </div>
            </div>
            <div className="rounded-lg border-[0.5px] border-ink-10 p-3 gap-2.5 flex flex-col">
              <p className="text-body-sm font-normal tracking-[0.5px] text-ink-90 line-clamp-2 ">
                “{comment}”
              </p>
              <div className="flex gap-2 items-center">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div
                    key={item}
                    className="px-3 py-1 bg-ink-3 rounded-pill font-normal text-caption text-[#000000]">
                    Tag
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))
      ) : (
        <EmptyState
          title="No Product to review yet"
          subtitle="Explore the store pages to review product"
          image="/images/emptystate/awaiting.svg">
          <Button
            variant="bordered"
            type="button"
            onClick={() => router.push("/shop")}
            className="text-body-sm !px-5 py-1 !w-[max-content]">
            Explore vendors
          </Button>
        </EmptyState>
      )}
    </div>
  );
};

export default Reviewed;
