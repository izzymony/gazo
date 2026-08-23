import React from "react";

interface Props {
  checked?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  subtitle?: string;
  color?: string;
  containerClass?: unknown;
  /** Accessible name for the toggle (announced by screen readers). */
  ariaLabel?: string;
}
export default function Switch({
  checked,
  onChange,
  name,
  color = "bg-green",
  containerClass,
  ariaLabel,
}: Props) {
  return (
    <label className={`flex items-center cursor-pointer  ${containerClass}`}>
      {/* sr-only (not hidden) keeps the control focusable + in the a11y tree, so
          the toggle is keyboard-operable and announced. Visually identical. */}
      <input
        type="checkbox"
        role="switch"
        aria-label={ariaLabel}
        className="toggle-checkbox sr-only peer"
        name={name}
        checked={checked}
        onChange={onChange}
      />

      <span className="relative rounded-full peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 peer-focus-visible:ring-offset-1">
        <span
          className={`block w-[32px] h-[20px] rounded-full transition-colors duration-200 ease-linear
            ${checked ? color : "bg-gray-300"}`}></span>
        <span
          className={`absolute left-1 top-[10%]  w-[15px] h-[15px] bg-white border border-gray-300 rounded-full transition-transform duration-200 ease-linear transform 
            ${checked ? "translate-x-3" : "-translate-x-1"}`}></span>
      </span>
    </label>
  );
}
