/* eslint-disable @next/next/no-img-element */
import React from "react";

interface EmptyStateProps {
  image?: string;
  /** HugeIcons (or any node) shown in a tokened circle instead of an illustration. */
  icon?: React.ReactNode;
  title?: string;
  subtitle?: string;
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
      <p className="text-sm font-medium text-foreground-secondary">{title}</p>
      {subtitle && (
        <p className="text-foreground-muted font-normal text-caption  w-[80%] mt-2">
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
};

export default EmptyState;
