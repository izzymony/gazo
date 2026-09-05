import { formatCurrency, calculateDiscountPercentage } from "@/lib/utils";

/**
 * Product title + share/like actions + price/discount + rating row, extracted
 * from the Product god-page (W4.4). Custom inline SVGs preserved verbatim; only
 * bounded props are threaded (tsc-verified).
 */
export default function ProductInfo({
  title,
  price,
  oldPrice,
  sales,
  ratings,
  liked,
  onShare,
  onLike,
}: {
  title?: string;
  price: number;
  oldPrice?: string | number;
  sales?: string | number;
  ratings: number;
  liked: boolean;
  onShare: () => void;
  onLike: () => void;
}) {
  const oldPriceNum = oldPrice ? +oldPrice : 0;
  const salesNum = sales ? +sales : 0;

  return (
    <div className="w-full px-4 py-4 md:px-6 lg:px-0">
      <div className="flex flex-row items-center gap-1 my-2">
        <h1 className="text-sm font-medium mr-auto max-w-[70%]">{title}</h1>

        <div onClick={onShare}>
          <svg
            width="36"
            height="36"
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="36" height="36" rx="18" fill="black" fillOpacity="0.05" />
            <mask
              id="mask0_4503_237884"
              maskUnits="userSpaceOnUse"
              x="8"
              y="8"
              width="20"
              height="20"
            >
              <rect x="8" y="8" width="20" height="20" fill="#D9D9D9" />
            </mask>
            <g mask="url(#mask0_4503_237884)">
              <path
                d="M25.2295 18.5052C25.4329 18.3308 25.5346 18.2436 25.5719 18.1399C25.6046 18.0488 25.6046 17.9492 25.5719 17.8582C25.5346 17.7544 25.4329 17.6672 25.2295 17.4929L18.1705 11.4423C17.8203 11.1422 17.6452 10.9921 17.497 10.9884C17.3682 10.9852 17.2451 11.0418 17.1637 11.1417C17.07 11.2567 17.07 11.4873 17.07 11.9485V15.5279C15.2911 15.8391 13.663 16.7405 12.4531 18.0939C11.134 19.5694 10.4043 21.479 10.4033 23.4582V23.9682C11.2778 22.9147 12.3696 22.0628 13.604 21.4706C14.6922 20.9485 15.8687 20.6393 17.07 20.5578V24.0495C17.07 24.5108 17.07 24.7414 17.1637 24.8563C17.2451 24.9562 17.3682 25.0128 17.497 25.0096C17.6452 25.006 17.8203 24.8559 18.1705 24.5557L25.2295 18.5052Z"
                stroke="white"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M25.2295 18.5052C25.4329 18.3308 25.5346 18.2436 25.5719 18.1399C25.6046 18.0488 25.6046 17.9492 25.5719 17.8582C25.5346 17.7544 25.4329 17.6672 25.2295 17.4929L18.1705 11.4423C17.8203 11.1422 17.6452 10.9921 17.497 10.9884C17.3682 10.9852 17.2451 11.0418 17.1637 11.1417C17.07 11.2567 17.07 11.4873 17.07 11.9485V15.5279C15.2911 15.8391 13.663 16.7405 12.4531 18.0939C11.134 19.5694 10.4043 21.479 10.4033 23.4582V23.9682C11.2778 22.9147 12.3696 22.0628 13.604 21.4706C14.6922 20.9485 15.8687 20.6393 17.07 20.5578V24.0495C17.07 24.5108 17.07 24.7414 17.1637 24.8563C17.2451 24.9562 17.3682 25.0128 17.497 25.0096C17.6452 25.006 17.8203 24.8559 18.1705 24.5557L25.2295 18.5052Z"
                stroke="black"
                strokeOpacity="0.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </svg>
        </div>
        <div onClick={onLike}>
          {liked ? (
            <svg
              width="36"
              height="36"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="36" height="36" rx="18" fill="black" fillOpacity="0.05" />
              <mask
                id="mask0_4503_237885"
                maskUnits="userSpaceOnUse"
                x="8"
                y="8"
                width="20"
                height="20"
              >
                <rect x="8" y="8" width="20" height="20" fill="#D9D9D9" />
              </mask>
              <g mask="url(#mask0_4503_237885)">
                <path
                  d="M21.4263 10.5C24.3614 10.5 26.3337 13.2938 26.3337 15.9C26.3337 21.1781 18.1485 25.5 18.0003 25.5C17.8522 25.5 9.66699 21.1781 9.66699 15.9C9.66699 13.2938 11.6392 10.5 14.5744 10.5C16.2596 10.5 17.3614 11.3531 18.0003 12.1031C18.6392 11.3531 19.7411 10.5 21.4263 10.5Z"
                  stroke="white"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M21.4263 10.5C24.3614 10.5 26.3337 13.2938 26.3337 15.9C26.3337 21.1781 18.1485 25.5 18.0003 25.5C17.8522 25.5 9.66699 21.1781 9.66699 15.9C9.66699 13.2938 11.6392 10.5 14.5744 10.5C16.2596 10.5 17.3614 11.3531 18.0003 12.1031C18.6392 11.3531 19.7411 10.5 21.4263 10.5Z"
                  stroke="black"
                  strokeOpacity="0.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </svg>
          ) : (
            <svg
              width="36"
              height="36"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="36" height="36" rx="18" fill="black" fillOpacity="0.05" />
              <mask
                id="mask0_4503_237885"
                maskUnits="userSpaceOnUse"
                x="8"
                y="8"
                width="20"
                height="20"
              >
                <rect x="8" y="8" width="20" height="20" fill="#D9D9D9" />
              </mask>
              <g mask="url(#mask0_4503_237885)">
                <path
                  d="M21.4263 10.5C24.3614 10.5 26.3337 13.2938 26.3337 15.9C26.3337 21.1781 18.1485 25.5 18.0003 25.5C17.8522 25.5 9.66699 21.1781 9.66699 15.9C9.66699 13.2938 11.6392 10.5 14.5744 10.5C16.2596 10.5 17.3614 11.3531 18.0003 12.1031C18.6392 11.3531 19.7411 10.5 21.4263 10.5Z"
                  stroke="black"
                  strokeOpacity="0.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </svg>
          )}
        </div>
      </div>

      <div className="flex items-center  w-full">
        <span className="text-xl font-medium">{formatCurrency(price)}</span>
        {oldPriceNum > 0 && (
          <>
            <span className="ml-2 mt-1 text-foreground-secondary line-through text-xs font-normal">
              {formatCurrency(oldPriceNum)}
            </span>
            <div className="ml-auto text-brandInk font-normal rounded-full bg-brand px-3 py-1 text-caption">
              {calculateDiscountPercentage(oldPriceNum, price)}% OFF
            </div>
          </>
        )}
      </div>

      <div className="flex items-center space-x-1 text-sm">
        {Array(ratings)
          .fill(null)
          .map((_: null, index: number) => (
            <div key={index}>
              <svg
                width="14"
                height="13"
                viewBox="0 0 14 13"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6.55163 0.908494C6.73504 0.536871 7.26496 0.53687 7.44837 0.908493L8.94091 3.93272C9.01374 4.08029 9.15453 4.18258 9.31738 4.20624L12.6548 4.6912C13.0649 4.75079 13.2287 5.25478 12.9319 5.54404L10.5169 7.89808C10.3991 8.01294 10.3453 8.17844 10.3731 8.34064L10.9432 11.6646C11.0133 12.073 10.5846 12.3845 10.2178 12.1917L7.23267 10.6223C7.08701 10.5457 6.91299 10.5457 6.76733 10.6223L3.78224 12.1917C3.41543 12.3845 2.98671 12.073 3.05676 11.6646L3.62687 8.34064C3.65468 8.17844 3.60091 8.01294 3.48307 7.89808L1.06808 5.54404C0.771321 5.25478 0.935076 4.75079 1.34519 4.6912L4.68262 4.20624C4.84547 4.18258 4.98626 4.08029 5.05909 3.93272L6.55163 0.908494Z"
                  fill="#FFDB4C"
                />
              </svg>
            </div>
          ))}
        {salesNum > 0 && (
          <p className="text-[#ACACAC] text-sm font-normal">({sales} sold)</p>
        )}
      </div>
    </div>
  );
}
