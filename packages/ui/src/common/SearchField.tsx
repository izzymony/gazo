"use client";

import { useId } from "react";
import { cn } from "@vibaar/utils";
import { CiSearch } from "../icons";
import { focusRing } from "../styles";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /**
   * Accessible name. A placeholder is not a label — it disappears the moment
   * the user types, leaving the field unnamed. Defaults to the placeholder so
   * existing call sites gain a name without changing.
   */
  ariaLabel?: string;
  className?: string;
}

export default function SearchField({
  value,
  onChange,
  placeholder = "Search",
  ariaLabel,
  className,
}: SearchFieldProps) {
  const id = useId();

  return (
    <div className="relative w-full">
      <CiSearch
        size={18}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
      />
      <input
        id={id}
        // type="search" gives the field its role and the browser's clear
        // affordance; it was type="text", so it neither looked nor announced
        // as a search field.
        type="search"
        role="searchbox"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className={cn(
          // Was `focus:outline-none` with only a border-colour change to replace
          // it — a colour shift alone is a weak focus indicator.
          "w-full rounded-field border border-outline py-2 pl-9 pr-3 text-body text-foreground-primary placeholder:text-foreground-muted focus:border-brandDeep",
          focusRing,
          className
        )}
      />
    </div>
  );
}
