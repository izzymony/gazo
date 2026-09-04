export default function FluidCard({
  text,
  backgroundcolor = "#FFFFFF33",
  bordercolor = "white",
}: {
  text: string;
  backgroundcolor?: string;
  bordercolor?: string;
}) {
  return (
    <div
      className="px-2 h-6 justify-center items-center flex text-caption leading-[12px] font-normal border-[0.005px] rounded-md whitespace-nowrap"
      style={{
        backgroundColor: backgroundcolor,
        borderColor: bordercolor,
        color: '#000000'
      }}>
      {text}
    </div>
  );
}

export const CartIcon = () => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg">
    <rect x="0.5" y="0.5" width="39" height="39" rx="19.5" stroke="var(--brand)" />
    <mask
      id="mask0_7633_264651"
      maskUnits="userSpaceOnUse"
      x="10"
      y="10"
      width="20"
      height="20">
      <rect x="10" y="10" width="20" height="20" fill="#D9D9D9" />
    </mask>
    <g mask="url(#mask0_7633_264651)">
      <path
        d="M11.7109 11.6719H12.7994C13.0044 11.6719 13.1069 11.6719 13.1894 11.7096C13.2621 11.7428 13.3237 11.7962 13.3669 11.8635C13.4159 11.9398 13.4304 12.0413 13.4594 12.2443L13.8538 15.0052L14.7304 21.448C14.8416 22.2656 14.8972 22.6744 15.0927 22.9822C15.2649 23.2533 15.5118 23.4689 15.8037 23.603C16.135 23.7552 16.5476 23.7552 17.3727 23.7552H24.5043C25.2897 23.7552 25.6825 23.7552 26.0034 23.6139C26.2864 23.4893 26.5291 23.2884 26.7045 23.0337C26.9034 22.7449 26.9769 22.3591 27.1238 21.5875L28.2269 15.7966C28.2786 15.525 28.3045 15.3893 28.267 15.2831C28.2341 15.19 28.1692 15.1116 28.0839 15.0619C27.9866 15.0052 27.8484 15.0052 27.572 15.0052H25.4363M19.7793 12V15M19.7793 15V18M19.7793 15H16.7793M19.7793 15H22.7793M18.3776 27.5052C18.3776 27.9654 18.0045 28.3385 17.5443 28.3385C17.084 28.3385 16.7109 27.9654 16.7109 27.5052C16.7109 27.045 17.084 26.6719 17.5443 26.6719C18.0045 26.6719 18.3776 27.045 18.3776 27.5052ZM25.0443 27.5052C25.0443 27.9654 24.6712 28.3385 24.2109 28.3385C23.7507 28.3385 23.3776 27.9654 23.3776 27.5052C23.3776 27.045 23.7507 26.6719 24.2109 26.6719C24.6712 26.6719 25.0443 27.045 25.0443 27.5052Z"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);

export const ShareIcon = () => (
  <svg
    width="36"
    height="36"
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg">
    <rect width="36" height="36" rx="18" fill="black" fillOpacity="0.03" />
    <mask
      id="mask0_7633_264648"
      maskUnits="userSpaceOnUse"
      x="8"
      y="8"
      width="20"
      height="20">
      <rect x="8" y="8" width="20" height="20" fill="#D9D9D9" />
    </mask>
    <g mask="url(#mask0_7633_264648)">
      <path
        d="M25.2295 18.5062C25.4329 18.3318 25.5346 18.2446 25.5719 18.1409C25.6046 18.0498 25.6046 17.9502 25.5719 17.8591C25.5346 17.7554 25.4329 17.6682 25.2295 17.4938L18.1705 11.4433C17.8203 11.1431 17.6452 10.9931 17.497 10.9894C17.3682 10.9862 17.2451 11.0428 17.1637 11.1427C17.07 11.2576 17.07 11.4883 17.07 11.9495V15.5289C15.2911 15.8401 13.663 16.7415 12.4531 18.0949C11.134 19.5704 10.4043 21.48 10.4033 23.4591V23.9691C11.2778 22.9157 12.3696 22.0638 13.604 21.4716C14.6922 20.9495 15.8687 20.6403 17.07 20.5588V24.0505C17.07 24.5117 17.07 24.7424 17.1637 24.8573C17.2451 24.9572 17.3682 25.0138 17.497 25.0106C17.6452 25.0069 17.8203 24.8569 18.1705 24.5567L25.2295 18.5062Z"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);

export const SavedIcon = () => (
  <svg
    width="36"
    height="36"
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg">
    <rect width="36" height="36" rx="18" fill="black" fillOpacity="0.03" />
    <mask
      id="mask0_7633_264647"
      maskUnits="userSpaceOnUse"
      x="8"
      y="8"
      width="20"
      height="20">
      <rect x="8" y="8" width="20" height="20" fill="#D9D9D9" />
    </mask>
    <g mask="url(#mask0_7633_264647)">
      <path
        d="M12.1665 14.5C12.1665 13.0999 12.1665 12.3998 12.439 11.865C12.6787 11.3946 13.0611 11.0122 13.5315 10.7725C14.0663 10.5 14.7664 10.5 16.1665 10.5H19.8332C21.2333 10.5 21.9334 10.5 22.4681 10.7725C22.9386 11.0122 23.321 11.3946 23.5607 11.865C23.8332 12.3998 23.8332 13.0999 23.8332 14.5V25.5L17.9998 22.1667L12.1665 25.5V14.5Z"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);

export const Unliked = () => (
  <svg
    width="36"
    height="36"
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg">
    <rect width="36" height="36" rx="18" fill="black" fillOpacity="0.03" />
    <mask
      id="mask0_7633_264646"
      maskUnits="userSpaceOnUse"
      x="8"
      y="8"
      width="20"
      height="20">
      <rect x="8" y="8" width="20" height="20" fill="#D9D9D9" />
    </mask>
    <g mask="url(#mask0_7633_264646)">
      <path
        d="M21.4258 10.5C24.3609 10.5 26.3332 13.2938 26.3332 15.9C26.3332 21.1781 18.148 25.5 17.9998 25.5C17.8517 25.5 9.6665 21.1781 9.6665 15.9C9.6665 13.2938 11.6387 10.5 14.5739 10.5C16.2591 10.5 17.3609 11.3531 17.9998 12.1031C18.6387 11.3531 19.7406 10.5 21.4258 10.5Z"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);

export const Liked = () => (
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
);
