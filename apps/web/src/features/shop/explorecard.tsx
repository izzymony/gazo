import { ReactNode } from "react";

export default function Explore({
  children,
  title,
  tik = false,
}: {
  children: ReactNode;
  title: string;
  tik?: boolean;
}) {
  return (
    <div className="gap-2 flex flex-col mb-5 ps-3">
      <div className="flex items-center gap-2">
        <p
          className={
            tik
              ? "text-body leading-[16px] tracking-wider font-medium text-white"
              : "text-body leading-[16px] tracking-wider font-medium text-black"
          }>
          {title}
        </p>
        <svg
          width="21"
          height="21"
          viewBox="0 0 21 21"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <mask
            id="mask0_9296_33417"
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="21"
            height="21">
            <rect x="0.789062" y="0.5" width="20" height="20" fill="#D9D9D9" />
          </mask>
          <g mask="url(#mask0_9296_33417)">
            <path
              d="M8.28906 15.5L13.2891 10.5L8.28906 5.5"
              stroke={tik ? "white" : "black"}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      </div>
      {children}
    </div>
  );
}
