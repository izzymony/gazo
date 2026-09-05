"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@vibaar/utils";

export interface AvatarProps {
  src?: string | null;
  /** Display name — drives initials + the deterministic fallback color. */
  name?: string;
  /** When provided, initials use first/last instead of splitting `name`. */
  firstName?: string;
  lastName?: string;
  size?: number;
  className?: string;
  onClick?: () => void;
  /** Shows the camera hover overlay (profile editing). */
  editable?: boolean;
  /** Always show the pointer cursor (e.g. store logos) vs. only when editable. */
  alwaysClickable?: boolean;
  /** Overrides the image alt text; defaults to the display name. */
  alt?: string;
}

// Deterministic gradient palette (shared by every avatar in the app).
const COLOR_PALETTE = [
  "from-blue-500 to-blue-600",
  "from-green-500 to-green-600",
  "from-purple-500 to-purple-600",
  "from-red-500 to-pink-500",
  "from-orange-500 to-orange-600",
  "from-teal-500 to-teal-600",
  "from-indigo-500 to-indigo-600",
  "from-pink-500 to-rose-500",
  "from-cyan-500 to-cyan-600",
  "from-emerald-500 to-emerald-600",
  "from-violet-500 to-violet-600",
  "from-amber-500 to-amber-600",
];

const colorFor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash = hash & hash;
  }
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
};

const CameraGlyph = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

/**
 * Shared avatar primitive (W3.7) — one implementation behind `UserProfileImage`
 * and `StoreLogo`. Renders the image (with graceful fallback to initials on a
 * deterministic gradient circle). Rendering is preserved from the previous
 * components; the wrappers just preset defaults.
 */
const Avatar = ({
  src,
  name = "",
  firstName = "",
  lastName = "",
  size = 48,
  className = "",
  onClick,
  editable = false,
  alwaysClickable = false,
  alt,
}: AvatarProps) => {
  const [imageError, setImageError] = useState(false);

  const displayName =
    firstName || lastName ? `${firstName} ${lastName}`.trim() : name;
  const initials =
    firstName || lastName
      ? (firstName ? firstName.charAt(0).toUpperCase() : "") +
        (lastName ? lastName.charAt(0).toUpperCase() : "")
      : displayName
          .split(" ")
          .slice(0, 2)
          .map((word) => word.charAt(0).toUpperCase())
          .join("");
  const clickable = alwaysClickable || editable;

  if (src && src.trim() !== "" && !imageError) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-full",
          clickable && "cursor-pointer",
          className
        )}
        onClick={onClick}
        style={{ width: size, height: size }}
      >
        <Image
          src={src}
          alt={alt ?? `${displayName} profile`}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
          priority={size > 100}
        />
        {editable && (
          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
            <CameraGlyph className="w-6 h-6 text-white opacity-0 hover:opacity-100" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-gradient-to-br text-white font-semibold",
        colorFor(displayName),
        clickable && "cursor-pointer",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      onClick={onClick}
    >
      {initials}
      {editable && (
        <div className="flex items-center justify-center">
          <div className="w-full h-[100px] inset-0 absolute bg-opacity-10 transition-all duration-200 flex items-center justify-center rounded-full">
            <CameraGlyph className="w-10 h-10 p-2 bg-black text-white opacity-50 hover:opacity-100 rounded-full" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Avatar;
