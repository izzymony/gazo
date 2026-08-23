import { ReactNode } from "react";
import { cn } from "@vibaar/utils";

interface HeroHeaderProps {
  /** Top control row — e.g. a back button on the left + actions (eye / settings)
   *  on the right. Laid out space-between. Optional. */
  topBar?: ReactNode;
  /** Hero body — the prominent content (balance, greeting, primary action). */
  children: ReactNode;
  /** Decorative absolute layer behind the content (e.g. a brand pattern image).
   *  Clipped to the hero's rounded bottom; sits below topBar/body. */
  backdrop?: ReactNode;
  className?: string;
}

/**
 * HeroHeader — the filled brand hero region for "hero" pages (wallet balance,
 * dashboard home, shop). Rendered full-bleed via PageShell's `hero` slot:
 * brand background, white text, rounded bottom, standard horizontal padding.
 * Page content flows below it in PageShell's normal padded 24px rhythm.
 *
 * Usage:
 *   <PageShell hero={<HeroHeader topBar={...}>{balance}</HeroHeader>}>
 *     {content sections}
 *   </PageShell>
 */
export default function HeroHeader({
  topBar,
  children,
  backdrop,
  className,
}: HeroHeaderProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden w-full max-w-full lg:max-w-5xl lg:mx-auto bg-brand text-white rounded-b-card px-4 lg:px-5 pt-4 pb-6",
        className
      )}>
      {backdrop && (
        <div className="absolute inset-0 z-0 pointer-events-none">{backdrop}</div>
      )}
      <div className="relative z-10">
        {topBar && (
          <div className="flex items-center justify-between">{topBar}</div>
        )}
        <div className={cn(topBar && "mt-7")}>{children}</div>
      </div>
    </div>
  );
}
