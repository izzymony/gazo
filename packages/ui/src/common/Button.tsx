"use client";

import React from "react";
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@vibaar/utils';
import { focusRing } from "../styles";
import Spinner from "./Spinner";

// Button variant system.
//   variant  — filled (primary CTA) · bordered (secondary/outline) · ghost (tertiary/text)
//   size     — sm (inline actions) · md (default) · lg (prominent CTA)
//   fullWidth— true (footer CTA bar, keeps the historic mt-4) · false (inline, hugs content)
// Default render (filled / md / fullWidth) is byte-identical to the previous
// component, so existing footerAction buttons are unchanged.
const buttonVariants = cva(
  cn(
    "max-w-full disabled:opacity-50 flex flex-row gap-2 justify-center items-center text-center rounded-full font-medium touch-manipulation transition-all duration-200",
    focusRing
  ),
  {
    variants: {
      size: {
        // `min-h-9` is the 36px touch floor, the same one IconButton (`md`),
        // Switch and ChipToggle already hold. Padding alone put `sm` at 28px,
        // which is how the storefront hero ended up with a 36px hand-rolled
        // "Edit store" pill sitting beside a 28px "Share store" Button — the
        // hand-rolled one existed because the primitive was the wrong height.
        sm: "min-h-9 py-1.5 px-4 text-body-sm",
        md: "py-3 px-4 text-body",
        lg: "py-4 px-6 text-body-lg",
      },
      variant: {
        filled:
          "bg-brand text-brandInk hover:bg-brandHover active:bg-brandHover",
        bordered:
          "border border-brandDeep text-brandDeep bg-surface hover:bg-surface-subtle active:bg-surface-muted",
        ghost:
          "bg-transparent text-brandDeep hover:bg-surface-subtle active:bg-surface-muted",
        // A text-only action sitting inside prose or beside a field — "Change",
        // "Resend code", "Add another". Eight screens hand-rolled a bare
        // <button className="text-brandDeep font-medium"> because the filled,
        // bordered and ghost variants all draw a pill, and a pill is wrong
        // there. It keeps the underline on hover so it still reads as an action.
        // `size` is declared above so its padding is emitted first; a link
        // action has no box, so this clears it without a compoundVariant.
        link: "bg-transparent p-0 rounded-none gap-1 text-brandDeep underline-offset-4 hover:underline active:opacity-70",
      },
      fullWidth: {
        true: "w-full mt-4",
        false: "w-fit",
      },
    },
    defaultVariants: { variant: "filled", size: "md", fullWidth: true },
  }
);

/**
 * Native <button> attributes are spread onto the element, so aria-*, id, name,
 * form, data-* and the rest work without the component having to enumerate
 * them. `onClick` is therefore optional: a `type="submit"` button inside a form
 * needs no handler at all.
 */
type ButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "className" | "type" | "disabled"
> & {
  children: React.ReactNode;
  className?: string;
  type?: "button" | "reset" | "submit";
  loading?: boolean;
  loadingText?: string; // Optional custom loading text
  disabled?: boolean; // Non-interactive + dimmed (uses the cva `disabled:opacity-50`)
  hapticFeedback?: boolean; // Enable/disable haptic feedback
  /**
   * Swallow the click instead of letting it bubble. OFF by default: a native
   * button bubbles, and a component should not silently change that for every
   * consumer. Nothing in the app relied on it — a scan for a Button rendered
   * inside a parent with its own onClick returned zero real cases. Opt in only
   * where a genuinely tappable ancestor would otherwise double-fire.
   */
  stopPropagation?: boolean;
} & VariantProps<typeof buttonVariants>;

// Haptic feedback utility
const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  // Check if the Vibration API is available
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    const duration = type === 'light' ? 10 : type === 'medium' ? 20 : 30;
    navigator.vibrate(duration);
  }

  // For iOS devices using the Taptic Engine (requires a native bridge)
  const iosHaptic = (
    window as unknown as {
      webkit?: { messageHandlers?: { haptic?: { postMessage: (t: string) => void } } };
    }
  )?.webkit?.messageHandlers?.haptic;
  if (typeof window !== 'undefined' && iosHaptic) {
    iosHaptic.postMessage(type);
  }
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    onClick,
    children,
    className = "",
    type = "button",
    loading = false,
    loadingText,
    disabled = false,
    variant = "filled",
    size = "md",
    fullWidth = true,
    hapticFeedback = true, // Enable by default for better mobile UX
    stopPropagation = false,
    // Pulled out of `rest` because each one collides with a value this
    // component controls. `rest` is spread FIRST below so these win.
    style,
    "aria-label": ariaLabel,
    "aria-busy": ariaBusy,
    ...rest
  },
  ref
) {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // NOTE: no preventDefault(). It used to be unconditional, which meant a
    // `type="submit"` button never actually submitted its form — every call
    // site worked around it by wiring formik.handleSubmit into onClick.
    if (stopPropagation) event.stopPropagation();

    if (loading || disabled) return;
    if (hapticFeedback) triggerHapticFeedback("light");
    onClick?.(event);
  };

  return (
    <button
      // `rest` FIRST so every attribute this component controls is applied
      // after it and cannot be clobbered. Previously `{...rest}` came last,
      // which let a caller's `style` replace the whole internal style object
      // and a caller's `aria-busy` override the loading state.
      {...rest}
      ref={ref}
      onClick={handleClick}
      className={cn(
        buttonVariants({ variant, size, fullWidth }),
        loading && "opacity-70 cursor-not-allowed",
        disabled && !loading && "opacity-50 cursor-not-allowed",
        className
      )}
      style={{
        boxShadow:
          variant === "filled" && !loading
            // Neutral, not brand-tinted. A coloured glow worked while the
            // brand was a saturated red; a yellow one is invisible on light
            // surfaces and muddy on white. Ink reads on every ground.
            ? "4px 8px 24px 0px rgb(var(--brand-ink-rgb) / 0.18)"
            : undefined,
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        userSelect: "none",
        WebkitUserSelect: "none",
        // Caller style merges over the internal one rather than replacing it.
        ...style,
      }}
      type={type}
      disabled={loading || disabled}
      // Loading is a fact about the control, so it wins; otherwise the caller's
      // value stands.
      aria-busy={loading ? true : ariaBusy}
      aria-label={ariaLabel ?? (loading ? loadingText || "Loading, please wait" : undefined)}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <Spinner color={variant === "filled" ? "var(--brand-ink)" : "var(--brand-deep)"} />
          {loadingText && <span>{loadingText}</span>}
        </span>
      ) : (
        children
      )}
    </button>
  );
});

export default Button;
