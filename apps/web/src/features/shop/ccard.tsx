/* eslint-disable @next/next/no-img-element */
export default function Card({
  liked,
  setLiked,
  tik = false,
}: {
  liked: boolean;
  setLiked: (val: boolean) => void;
  tik?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <div className="p-2 gap-2 flex-col flex">
        <div className="relative w-[140px] h-[140px]">
          <img
            src="/PRODUCT IMAGE (2).PNG"
            alt="img"
            className="rounded-xl object-cover w-[140px] h-[140px]"
          />
          <div className="absolute flex flex-col justify-between top-0 bottom-0 left-0 right-0 flex-1">
            <div className="flex justify-between ps-1">
              <div className="bg-brand rounded-full flex justify-center items-center text-center text-brandInk text-body-sm px-2 h-4 mt-1">
                20% Off
              </div>
              <div
                className={`cursor-pointer mt-3 me-2`}
                onClick={(e) => {
                  e.stopPropagation();
                  setLiked(!liked);
                  // handleLikeClick(index);
                }}>
                {liked ? (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <rect
                      x="0.40918"
                      y="-0.00390625"
                      width="19.5907"
                      height="19.5907"
                      rx="9.79535"
                      fill="black"
                      fillOpacity="0.15"
                    />
                    <mask
                      id="mask0_7965_57995"
                      maskUnits="userSpaceOnUse"
                      x="4"
                      y="4"
                      width="12"
                      height="12">
                      <rect
                        x="4.7627"
                        y="4.34766"
                        width="10.8837"
                        height="10.8837"
                        fill="#D9D9D9"
                      />
                    </mask>
                    <g mask="url(#mask0_7965_57995)">
                      <path
                        d="M12.0696 5.16406C13.6669 5.16406 14.7402 6.68438 14.7402 8.10267C14.7402 10.9749 10.2859 13.3269 10.2053 13.3269C10.1247 13.3269 5.67041 10.9749 5.67041 8.10267C5.67041 6.68438 6.74367 5.16406 8.34095 5.16406C9.25801 5.16406 9.85762 5.62832 10.2053 6.03646C10.553 5.62832 11.1526 5.16406 12.0696 5.16406Z"
                        fill="white"
                      />
                    </g>
                  </svg>
                ) : (
                  <svg
                    width="24"
                    height="26"
                    viewBox="0 0 24 26"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <rect
                      y="0.078125"
                      width="24"
                      height="25.92"
                      rx="12"
                      fill="black"
                      fillOpacity="0.15"
                    />
                    <mask
                      id="mask0_4497_233610"
                      maskUnits="userSpaceOnUse"
                      x="4"
                      y="5"
                      width="16"
                      height="16">
                      <rect
                        x="4.79932"
                        y="5.83984"
                        width="14.4"
                        height="14.4"
                        fill="#D9D9D9"
                      />
                    </mask>
                    <g mask="url(#mask0_4497_233610)">
                      <path
                        d="M14.4659 7.64062C16.5793 7.64062 17.9993 9.65213 17.9993 11.5286C17.9993 15.3289 12.1059 18.4406 11.9993 18.4406C11.8926 18.4406 5.99927 15.3289 5.99927 11.5286C5.99927 9.65213 7.41927 7.64062 9.5326 7.64062C10.7459 7.64062 11.5393 8.25488 11.9993 8.79488C12.4593 8.25488 13.2526 7.64062 14.4659 7.64062Z"
                        stroke="white"
                        strokeWidth="0.72"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  </svg>
                )}
              </div>
            </div>

            <div className="flex gap-1 items-center ps-3 pb-2">
              <img
                src="/PRODUCT IMAGE (2).PNG"
                alt="img"
                className="rounded-full object-cover w-[16px] h-[16px]"
              />
              <p className="text-white font-medium text-caption tracking-wider leading-[10px]">
                Brand name
              </p>
            </div>
          </div>
        </div>
        <div className="gap-1 flex flex-col  w-[140px]">
          <p
            className={
              tik
                ? "text-caption tracking-wider leading-[10px] text-white font-medium line-clamp-1"
                : "text-caption tracking-wider leading-[10px] text-black font-medium line-clamp-1"
            }>
            Gucci bag – the epitome of luxury and sophistication
          </p>
          <div className="flex items-center justify-between">
            <p
              className={
                tik
                  ? "text-micro tracking-wider leading-[10px] text-white line-through font-normal line-clamp-1"
                  : "text-micro tracking-wider leading-[10px] text-ink-40 line-through font-normal line-clamp-1"
              }>
              ₦12,000.00
            </p>
            <div className="flex items-center gap-1">
              <svg
                width="12"
                height="11"
                viewBox="0 0 12 11"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M5.26888 0.657725C5.40333 0.385344 5.47056 0.249153 5.56182 0.20564C5.64122 0.167781 5.73347 0.167781 5.81287 0.20564C5.90414 0.249153 5.97136 0.385343 6.10581 0.657725L7.38137 3.24187C7.42107 3.32229 7.44091 3.36249 7.46992 3.39371C7.4956 3.42135 7.52639 3.44374 7.56061 3.45965C7.59924 3.47762 7.64361 3.48411 7.73234 3.49708L10.5856 3.91412C10.886 3.95804 11.0363 3.97999 11.1058 4.05338C11.1663 4.11723 11.1947 4.20496 11.1832 4.29216C11.17 4.39238 11.0612 4.49831 10.8437 4.71018L8.77985 6.72037C8.71551 6.78303 8.68334 6.81436 8.66259 6.85164C8.64421 6.88465 8.63242 6.92091 8.62787 6.95842C8.62273 7.00078 8.63033 7.04504 8.64551 7.13355L9.13248 9.97286C9.18384 10.2723 9.20952 10.4221 9.16126 10.5109C9.11927 10.5882 9.04463 10.6424 8.95812 10.6585C8.8587 10.6769 8.72424 10.6062 8.45532 10.4648L5.90456 9.12336C5.82508 9.08156 5.78534 9.06067 5.74348 9.05246C5.70641 9.04519 5.66828 9.04519 5.63122 9.05246C5.58935 9.06067 5.54961 9.08156 5.47014 9.12336L2.91938 10.4648C2.65045 10.6062 2.51599 10.6769 2.41657 10.6585C2.33007 10.6424 2.25543 10.5882 2.21343 10.5109C2.16517 10.4221 2.19085 10.2723 2.24221 9.97286L2.72919 7.13355C2.74437 7.04504 2.75196 7.00078 2.74682 6.95842C2.74228 6.92091 2.73049 6.88465 2.71211 6.85164C2.69135 6.81436 2.65918 6.78303 2.59485 6.72037L0.530997 4.71018C0.313474 4.49831 0.204712 4.39238 0.191478 4.29216C0.179962 4.20496 0.20841 4.11723 0.2689 4.05338C0.338424 3.97999 0.488654 3.95804 0.789113 3.91412L3.64235 3.49708C3.73108 3.48411 3.77545 3.47762 3.81409 3.45965C3.8483 3.44374 3.8791 3.42135 3.90478 3.39371C3.93378 3.36249 3.95363 3.32229 3.99332 3.24187L5.26888 0.657725Z"
                  fill="white"
                />
                <path
                  d="M5.26888 0.657725C5.40333 0.385344 5.47056 0.249153 5.56182 0.20564C5.64122 0.167781 5.73347 0.167781 5.81287 0.20564C5.90414 0.249153 5.97136 0.385343 6.10581 0.657725L7.38137 3.24187C7.42107 3.32229 7.44091 3.36249 7.46992 3.39371C7.4956 3.42135 7.52639 3.44374 7.56061 3.45965C7.59924 3.47762 7.64361 3.48411 7.73234 3.49708L10.5856 3.91412C10.886 3.95804 11.0363 3.97999 11.1058 4.05338C11.1663 4.11723 11.1947 4.20496 11.1832 4.29216C11.17 4.39238 11.0612 4.49831 10.8437 4.71018L8.77985 6.72037C8.71551 6.78303 8.68334 6.81436 8.66259 6.85164C8.64421 6.88465 8.63242 6.92091 8.62787 6.95842C8.62273 7.00078 8.63033 7.04504 8.64551 7.13355L9.13248 9.97286C9.18384 10.2723 9.20952 10.4221 9.16126 10.5109C9.11927 10.5882 9.04463 10.6424 8.95812 10.6585C8.8587 10.6769 8.72424 10.6062 8.45532 10.4648L5.90456 9.12336C5.82508 9.08156 5.78534 9.06067 5.74348 9.05246C5.70641 9.04519 5.66828 9.04519 5.63122 9.05246C5.58935 9.06067 5.54961 9.08156 5.47014 9.12336L2.91938 10.4648C2.65045 10.6062 2.51599 10.6769 2.41657 10.6585C2.33007 10.6424 2.25543 10.5882 2.21343 10.5109C2.16517 10.4221 2.19085 10.2723 2.24221 9.97286L2.72919 7.13355C2.74437 7.04504 2.75196 7.00078 2.74682 6.95842C2.74228 6.92091 2.73049 6.88465 2.71211 6.85164C2.69135 6.81436 2.65918 6.78303 2.59485 6.72037L0.530997 4.71018C0.313474 4.49831 0.204712 4.39238 0.191478 4.29216C0.179962 4.20496 0.20841 4.11723 0.2689 4.05338C0.338424 3.97999 0.488654 3.95804 0.789113 3.91412L3.64235 3.49708C3.73108 3.48411 3.77545 3.47762 3.81409 3.45965C3.8483 3.44374 3.8791 3.42135 3.90478 3.39371C3.93378 3.36249 3.95363 3.32229 3.99332 3.24187L5.26888 0.657725Z"
                  fill="black"
                  fillOpacity="0.9"
                />
              </svg>
              <p
                className={
                  tik
                    ? "text-caption tracking-wider leading-[10px] text-white font-normal line-clamp-1"
                    : "text-caption tracking-wider leading-[10px] text-ink-40 font-normal line-clamp-1"
                }>
                4.5
              </p>
            </div>
          </div>
          <p
            className={
              tik
                ? "text-body-sm tracking-wider leading-[12px] text-brandDeep font-medium line-clamp-1"
                : "text-body-sm tracking-wider leading-[12px] text-black font-medium line-clamp-1"
            }>
            ₦180,000.00
          </p>
          <div className="flex justify-between">
            <div className="flex flex-row rounded-full h-[20px] px-2 justify-center items-center bg-[#FFEBEB]">
              <p className="text-caption tracking-wider leading-[10px] text-black font-regular line-clamp-1">
                🔥 Trending
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Cards({
  liked,
  setLiked,
  tik = false,
}: {
  liked: boolean;
  setLiked: (val: boolean) => void;
  tik?: boolean;
}) {
  return (
    <div className="flex justify-between flex-1">
      <div className="p-2 gap-2 flex-col flex">
        <div className="relative w-full h-[150px]">
          <img
            src="/PRODUCT IMAGE (2).PNG"
            alt="img"
            className="rounded-xl object-cover w-full h-[150px]"
          />
          <div className="absolute flex flex-col justify-between top-0 bottom-0 left-0 right-0 flex-1">
            <div className="flex justify-between ps-1">
              <div className="bg-brand rounded-full flex justify-center items-center text-center text-brandInk text-body-sm px-2 h-4 mt-1">
                20% Off
              </div>
              <div
                className={`cursor-pointer mt-3 me-2`}
                onClick={(e) => {
                  e.stopPropagation();
                  setLiked(!liked);
                  // handleLikeClick(index);
                }}>
                {liked ? (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <rect
                      x="0.40918"
                      y="-0.00390625"
                      width="19.5907"
                      height="19.5907"
                      rx="9.79535"
                      fill="black"
                      fillOpacity="0.15"
                    />
                    <mask
                      id="mask0_7965_57995"
                      maskUnits="userSpaceOnUse"
                      x="4"
                      y="4"
                      width="12"
                      height="12">
                      <rect
                        x="4.7627"
                        y="4.34766"
                        width="10.8837"
                        height="10.8837"
                        fill="#D9D9D9"
                      />
                    </mask>
                    <g mask="url(#mask0_7965_57995)">
                      <path
                        d="M12.0696 5.16406C13.6669 5.16406 14.7402 6.68438 14.7402 8.10267C14.7402 10.9749 10.2859 13.3269 10.2053 13.3269C10.1247 13.3269 5.67041 10.9749 5.67041 8.10267C5.67041 6.68438 6.74367 5.16406 8.34095 5.16406C9.25801 5.16406 9.85762 5.62832 10.2053 6.03646C10.553 5.62832 11.1526 5.16406 12.0696 5.16406Z"
                        fill="white"
                      />
                    </g>
                  </svg>
                ) : (
                  <svg
                    width="24"
                    height="26"
                    viewBox="0 0 24 26"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <rect
                      y="0.078125"
                      width="24"
                      height="25.92"
                      rx="12"
                      fill="black"
                      fillOpacity="0.15"
                    />
                    <mask
                      id="mask0_4497_233610"
                      maskUnits="userSpaceOnUse"
                      x="4"
                      y="5"
                      width="16"
                      height="16">
                      <rect
                        x="4.79932"
                        y="5.83984"
                        width="14.4"
                        height="14.4"
                        fill="#D9D9D9"
                      />
                    </mask>
                    <g mask="url(#mask0_4497_233610)">
                      <path
                        d="M14.4659 7.64062C16.5793 7.64062 17.9993 9.65213 17.9993 11.5286C17.9993 15.3289 12.1059 18.4406 11.9993 18.4406C11.8926 18.4406 5.99927 15.3289 5.99927 11.5286C5.99927 9.65213 7.41927 7.64062 9.5326 7.64062C10.7459 7.64062 11.5393 8.25488 11.9993 8.79488C12.4593 8.25488 13.2526 7.64062 14.4659 7.64062Z"
                        stroke="white"
                        strokeWidth="0.72"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  </svg>
                )}
              </div>
            </div>

            <div className="flex gap-1 items-center ps-3 pb-2">
              <img
                src="/PRODUCT IMAGE (2).PNG"
                alt="img"
                className="rounded-full object-cover w-[16px] h-[16px]"
              />
              <p className="text-white font-medium text-caption tracking-wider leading-[10px]">
                Brand name
              </p>
            </div>
          </div>
        </div>
        <div className="gap-1 flex flex-col  w-full">
          <p
            className={
              tik
                ? "text-caption tracking-wider leading-[10px] text-white font-medium line-clamp-1"
                : "text-caption tracking-wider leading-[10px] text-black font-medium line-clamp-1"
            }>
            Gucci bag – the epitome of luxury and sophistication
          </p>
          <div className="flex items-center justify-between">
            <p
              className={
                tik
                  ? "text-micro tracking-wider leading-[10px] text-white line-through font-normal line-clamp-1"
                  : "text-micro tracking-wider leading-[10px] text-ink-40 line-through font-normal line-clamp-1"
              }>
              ₦12,000.00
            </p>
            <div className="flex items-center gap-1">
              <svg
                width="12"
                height="11"
                viewBox="0 0 12 11"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M5.26888 0.657725C5.40333 0.385344 5.47056 0.249153 5.56182 0.20564C5.64122 0.167781 5.73347 0.167781 5.81287 0.20564C5.90414 0.249153 5.97136 0.385343 6.10581 0.657725L7.38137 3.24187C7.42107 3.32229 7.44091 3.36249 7.46992 3.39371C7.4956 3.42135 7.52639 3.44374 7.56061 3.45965C7.59924 3.47762 7.64361 3.48411 7.73234 3.49708L10.5856 3.91412C10.886 3.95804 11.0363 3.97999 11.1058 4.05338C11.1663 4.11723 11.1947 4.20496 11.1832 4.29216C11.17 4.39238 11.0612 4.49831 10.8437 4.71018L8.77985 6.72037C8.71551 6.78303 8.68334 6.81436 8.66259 6.85164C8.64421 6.88465 8.63242 6.92091 8.62787 6.95842C8.62273 7.00078 8.63033 7.04504 8.64551 7.13355L9.13248 9.97286C9.18384 10.2723 9.20952 10.4221 9.16126 10.5109C9.11927 10.5882 9.04463 10.6424 8.95812 10.6585C8.8587 10.6769 8.72424 10.6062 8.45532 10.4648L5.90456 9.12336C5.82508 9.08156 5.78534 9.06067 5.74348 9.05246C5.70641 9.04519 5.66828 9.04519 5.63122 9.05246C5.58935 9.06067 5.54961 9.08156 5.47014 9.12336L2.91938 10.4648C2.65045 10.6062 2.51599 10.6769 2.41657 10.6585C2.33007 10.6424 2.25543 10.5882 2.21343 10.5109C2.16517 10.4221 2.19085 10.2723 2.24221 9.97286L2.72919 7.13355C2.74437 7.04504 2.75196 7.00078 2.74682 6.95842C2.74228 6.92091 2.73049 6.88465 2.71211 6.85164C2.69135 6.81436 2.65918 6.78303 2.59485 6.72037L0.530997 4.71018C0.313474 4.49831 0.204712 4.39238 0.191478 4.29216C0.179962 4.20496 0.20841 4.11723 0.2689 4.05338C0.338424 3.97999 0.488654 3.95804 0.789113 3.91412L3.64235 3.49708C3.73108 3.48411 3.77545 3.47762 3.81409 3.45965C3.8483 3.44374 3.8791 3.42135 3.90478 3.39371C3.93378 3.36249 3.95363 3.32229 3.99332 3.24187L5.26888 0.657725Z"
                  fill="white"
                />
                <path
                  d="M5.26888 0.657725C5.40333 0.385344 5.47056 0.249153 5.56182 0.20564C5.64122 0.167781 5.73347 0.167781 5.81287 0.20564C5.90414 0.249153 5.97136 0.385343 6.10581 0.657725L7.38137 3.24187C7.42107 3.32229 7.44091 3.36249 7.46992 3.39371C7.4956 3.42135 7.52639 3.44374 7.56061 3.45965C7.59924 3.47762 7.64361 3.48411 7.73234 3.49708L10.5856 3.91412C10.886 3.95804 11.0363 3.97999 11.1058 4.05338C11.1663 4.11723 11.1947 4.20496 11.1832 4.29216C11.17 4.39238 11.0612 4.49831 10.8437 4.71018L8.77985 6.72037C8.71551 6.78303 8.68334 6.81436 8.66259 6.85164C8.64421 6.88465 8.63242 6.92091 8.62787 6.95842C8.62273 7.00078 8.63033 7.04504 8.64551 7.13355L9.13248 9.97286C9.18384 10.2723 9.20952 10.4221 9.16126 10.5109C9.11927 10.5882 9.04463 10.6424 8.95812 10.6585C8.8587 10.6769 8.72424 10.6062 8.45532 10.4648L5.90456 9.12336C5.82508 9.08156 5.78534 9.06067 5.74348 9.05246C5.70641 9.04519 5.66828 9.04519 5.63122 9.05246C5.58935 9.06067 5.54961 9.08156 5.47014 9.12336L2.91938 10.4648C2.65045 10.6062 2.51599 10.6769 2.41657 10.6585C2.33007 10.6424 2.25543 10.5882 2.21343 10.5109C2.16517 10.4221 2.19085 10.2723 2.24221 9.97286L2.72919 7.13355C2.74437 7.04504 2.75196 7.00078 2.74682 6.95842C2.74228 6.92091 2.73049 6.88465 2.71211 6.85164C2.69135 6.81436 2.65918 6.78303 2.59485 6.72037L0.530997 4.71018C0.313474 4.49831 0.204712 4.39238 0.191478 4.29216C0.179962 4.20496 0.20841 4.11723 0.2689 4.05338C0.338424 3.97999 0.488654 3.95804 0.789113 3.91412L3.64235 3.49708C3.73108 3.48411 3.77545 3.47762 3.81409 3.45965C3.8483 3.44374 3.8791 3.42135 3.90478 3.39371C3.93378 3.36249 3.95363 3.32229 3.99332 3.24187L5.26888 0.657725Z"
                  fill="black"
                  fillOpacity="0.9"
                />
              </svg>
              <p
                className={
                  tik
                    ? "text-caption tracking-wider leading-[10px] text-white font-normal line-clamp-1"
                    : "text-caption tracking-wider leading-[10px] text-ink-40 font-normal line-clamp-1"
                }>
                4.5
              </p>
            </div>
          </div>
          <p
            className={
              tik
                ? "text-body-sm tracking-wider leading-[12px] text-brandDeep font-medium line-clamp-1"
                : "text-body-sm tracking-wider leading-[12px] text-black font-medium line-clamp-1"
            }>
            ₦180,000.00
          </p>
          <div className="flex justify-between">
            <div className="flex flex-row rounded-full h-[20px] px-2 justify-center items-center bg-[#FFEBEB]">
              <p className="text-caption tracking-wider leading-[10px] text-black font-regular line-clamp-1">
                🔥 Trending
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
