import { ReactNode } from "react";
import NavItem from "@vibaar/ui/common/NavItem";

/**
 * A destination in the spotlights bottom bar = the shared `NavItem` preset for
 * that bar's per-state artwork.
 *
 * It was a `<div onClick={router.push}>`: not focusable, no role, ignoring
 * Enter and Space, and colouring its idle label with a raw `#616161`. The
 * caller still chooses which glyph to show for the active and idle states —
 * that artwork genuinely differs per state here — and NavItem supplies the
 * link semantics and the accessible name.
 */
export default function Navicard({
  icon,
  tab,
  active,
  route,
}: {
  icon: ReactNode;
  tab: string;
  active: boolean;
  route: string;
}) {
  return (
    <NavItem
      href={route}
      icon={icon}
      label={tab}
      showLabel
      active={active}
      className="flex-1 py-2"
    />
  );
}
