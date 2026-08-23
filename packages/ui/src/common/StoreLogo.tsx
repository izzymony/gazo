"use client";

import Avatar from "./Avatar";

interface StoreLogoProps {
  src?: string | null;
  storeName?: string;
  size?: number;
  className?: string;
  onClick?: () => void;
}

/** Store logo = the shared Avatar preset for stores (always clickable). (W3.7) */
const StoreLogo = ({
  src,
  storeName = "Store",
  size = 30,
  className = "",
  onClick,
}: StoreLogoProps) => (
  <Avatar
    src={src}
    name={storeName}
    size={size}
    className={className}
    onClick={onClick}
    alwaysClickable
    alt={`${storeName} logo`}
  />
);

export default StoreLogo;
