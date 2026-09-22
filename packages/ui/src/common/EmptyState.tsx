/* eslint-disable @next/next/no-img-element */
import React from "react";

interface EmptyStateProps {
  image?: string;
  /** HugeIcons (or any node) shown in a tokened circle instead of an illustration. */
  icon?: React.ReactNode;
  title?: string;
  subtitle?: string;
  /** Call to action. EmptyState provides the spacing above it. */
  children?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  image,
  icon,
  title,
  subtitle,
  children,
}: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8">
      {icon ? (
        <div className="w-20 h-20 mb-4 rounded-full bg-surface-subtle flex items-center justify-center text-foreground-muted">
          {icon}
        </div>
      ) : (
        <img src={image} alt="Empty state" className="w-28 h-28 mb-4" />
      )}
      <p className="text-body-sm font-medium text-foreground-secondary">{title}</p>
      {subtitle && (
        <p className="text-foreground-muted font-normal text-caption  w-[80%] mt-2">
          {subtitle}
        </p>
      )}
      {/* EmptyState owns the gap before its call to action. It used to render
          children bare, so the CTA's own `mt-4` — which Button only applies at
          fullWidth — was silently doing the spacing. That is why six call sites
          could not use `fullWidth={false}` without the button jumping up into
          the subtitle, and reached for !important instead. */}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};

export default EmptyState;
