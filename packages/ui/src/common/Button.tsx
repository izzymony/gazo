import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@vibaar/utils';

// Button variant system.
//   variant  — filled (primary CTA) · bordered (secondary/outline) · ghost (tertiary/text)
//   size     — sm (inline actions) · md (default) · lg (prominent CTA)
//   fullWidth— true (footer CTA bar, keeps the historic mt-4) · false (inline, hugs content)
// Default render (filled / md / fullWidth) is byte-identical to the previous
// component, so existing footerAction buttons are unchanged.
const buttonVariants = cva(
  "max-w-full disabled:opacity-50 flex flex-row gap-2 justify-center items-center text-center rounded-full font-500 touch-manipulation transition-all duration-200",
  {
    variants: {
      variant: {
        filled:
          "bg-brand text-white hover:bg-brandHover active:bg-brandHover",
        bordered:
          "border border-brand text-brand bg-white hover:bg-ink-3 active:bg-ink-5",
        ghost:
          "bg-transparent text-brand hover:bg-ink-3 active:bg-ink-5",
      },
      size: {
        sm: "py-1.5 px-4 text-body-sm",
        md: "py-3 px-4 text-body",
        lg: "py-4 px-6 text-body-lg",
      },
      fullWidth: {
        true: "w-full mt-4",
        false: "w-fit",
      },
    },
    defaultVariants: { variant: "filled", size: "md", fullWidth: true },
  }
);

type ButtonProps = {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  type?: "button" | "reset" | "submit";
  loading?: boolean;
  loadingText?: string; // Optional custom loading text
  disabled?: boolean; // Non-interactive + dimmed (uses the cva `disabled:opacity-50`)
  hapticFeedback?: boolean; // Enable/disable haptic feedback
} & VariantProps<typeof buttonVariants>;

// Spinner component for loading state
const LoadingSpinner = ({ color = "currentColor" }: { color?: string }) => (
  <svg
    className="animate-spin h-5 w-5"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke={color}
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill={color}
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

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

export default function Button({
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
}: ButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!loading && !disabled) {
      if (hapticFeedback) {
        triggerHapticFeedback('light');
      }
      onClick();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!loading && !disabled) {
      if (hapticFeedback) {
        triggerHapticFeedback('light');
      }
      onClick();
    }
  };

  // Handle touch start for immediate visual feedback
  const handleTouchStart = () => {
    if (!loading && !disabled && hapticFeedback) {
      triggerHapticFeedback('light');
    }
  };

  return (
    <button
      onClick={handleClick}
      onTouchEnd={handleTouchEnd}
      onTouchStart={handleTouchStart}
      className={cn(
        buttonVariants({ variant, size, fullWidth }),
        loading && "opacity-70 cursor-not-allowed",
        disabled && !loading && "opacity-50 cursor-not-allowed",
        className
      )}
      style={{
        boxShadow:
          variant === "filled" && !loading
            ? '4px 8px 24px 0px rgb(var(--brand-rgb) / 0.2)'
            : undefined,
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      type={type}
      disabled={loading || disabled}
      aria-busy={loading}
      aria-label={loading ? (loadingText || "Loading, please wait") : undefined}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <LoadingSpinner color={variant === "filled" ? "white" : "var(--brand)"} />
          {loadingText && <span>{loadingText}</span>}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
