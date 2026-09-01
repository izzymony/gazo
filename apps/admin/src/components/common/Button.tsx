import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "filled" | "bordered" | "ghost" | "filter";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  loading?: boolean;
  loadingText?: string;
}

// Simple loading spinner
const LoadingSpinner = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    className={`animate-spin ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

export default function Button({
  children,
  className = "",
  variant = "filled",
  size = "md",
  fullWidth = false,
  loading = false,
  loadingText,
  disabled = false,
  type = "button",
  ...props
}: ButtonProps) {
  // Base classes for all buttons - maintaining brand styling
  const baseClasses = "inline-flex items-center justify-center gap-1 rounded-full font-medium transition-all duration-200 whitespace-nowrap focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed touch-manipulation";

  // Size variants - matching original brand sizes
  const sizeClasses = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm", 
    lg: "h-12 px-6 text-base"
  };

  // Color variants - maintaining exact brand colors and styles
  const variantClasses = {
    filled: "bg-brand text-brandInk hover:bg-red-600 active:bg-red-700",
    bordered: "border border-brandDeep text-brandDeep bg-white hover:bg-red-50 active:bg-red-100",
    ghost: "text-brandDeep bg-transparent hover:bg-red-50 active:bg-red-100",
    filter: "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
  };

  // Width classes
  const widthClasses = fullWidth ? "w-full" : "w-auto";

  // Combine all classes
  const buttonClasses = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClasses} ${className}`;

  const isDisabled = disabled || loading;

  // Apply brand shadow only to filled variant when not disabled
  const buttonStyle = {
    boxShadow: variant === "filled" && !isDisabled ? '4px 8px 24px 0px rgba(20, 19, 14, 0.18)' : undefined,
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none' as const,
    WebkitUserSelect: 'none' as const,
  };

  return (
    <button
      className={buttonClasses}
      style={buttonStyle}
      disabled={isDisabled}
      type={type}
      aria-busy={loading}
      aria-label={loading ? (loadingText || "Loading...") : undefined}
      {...props}
    >
      {loading && (
        <LoadingSpinner className="w-4 h-4" />
      )}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}