import { ReactNode } from "react";
import { cn } from "@vibaar/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * Card — the canonical bordered surface (design-system content layer).
 *
 * Replaces the ad-hoc `border border-ink-10 rounded-xl p-3 px-4` /
 * `py-3 px-2` markup that drifted page-to-page. One border, one radius
 * (`rounded-card` = 16px token), one padding (`p-4`), one bg. Pass row
 * layout etc. via `className`; `onClick` makes the whole card tappable.
 */
export default function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "border border-ink-10 rounded-card bg-white p-4",
        onClick && "cursor-pointer",
        className
      )}>
      {children}
    </div>
  );
}
