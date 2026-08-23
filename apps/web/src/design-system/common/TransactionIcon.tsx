import { HugeiconsIcon } from "@hugeicons/react";
import {
  WalletAdd01Icon,
  ShoppingBag02Icon,
  MoneySend01Icon,
  Clock01Icon,
  AlertCircleIcon,
  ArrowReloadHorizontalIcon,
  Invoice01Icon,
  GiftIcon,
  Coins01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

type TxType = "credit" | "debit" | "pending";
type Glyph = React.ComponentProps<typeof HugeiconsIcon>["icon"];

/** Transaction kind → glyph. Falls back to a generic coin. */
const GLYPH: Record<string, Glyph> = {
  topup: WalletAdd01Icon,
  order: ShoppingBag02Icon,
  payout: MoneySend01Icon,
  payoutpending: Clock01Icon,
  payoutdeclined: AlertCircleIcon,
  refund: ArrowReloadHorizontalIcon,
  billing: Invoice01Icon,
  refferal: GiftIcon,
};

/** The glyph is coloured by money direction; the circle stays neutral. */
const GLYPH_COLOR: Record<TxType, string> = {
  credit: "text-green-700",
  debit: "text-instaRed",
  pending: "text-yellow-600",
};

interface TransactionIconProps {
  /** Transaction kind (topup, order, payout, …). */
  icon?: string;
  /** Money direction — colours the glyph. */
  type?: TxType;
  /** `md` = list row (40px), `lg` = detail hero (64px). */
  size?: "md" | "lg";
}

/**
 * TransactionIcon — the transaction badge (HugeIcons).
 *
 * Replaces the hand-rolled inline-SVG `SelectIcon`. Same construction as the
 * activity rows: a neutral `bg-ink-5` circle behind the glyph. The glyph itself
 * is coloured (by money direction); only the circle background is neutral.
 */
export default function TransactionIcon({
  icon,
  type = "pending",
  size = "md",
}: TransactionIconProps) {
  const glyph = (icon && GLYPH[icon]) || Coins01Icon;
  const box = size === "lg" ? "w-16 h-16" : "w-10 h-10";
  const glyphPx = size === "lg" ? 30 : 20;
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center flex-shrink-0 bg-ink-5",
        GLYPH_COLOR[type] ?? GLYPH_COLOR.pending,
        box
      )}>
      <HugeiconsIcon icon={glyph} size={glyphPx} strokeWidth={2} />
    </div>
  );
}
