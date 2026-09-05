import { cn } from "@vibaar/utils";

interface ListSectionHeaderProps {
  title: string;
  /** Optional trailing action, e.g. { label: "See All", onClick }. */
  action?: { label: string; onClick: () => void };
  className?: string;
}

export default function ListSectionHeader({ title, action, className }: ListSectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <p className="text-body font-medium text-foreground-primary">{title}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="text-brandDeep text-body-sm font-medium min-h-[36px] flex items-center">
          {action.label}
        </button>
      )}
    </div>
  );
}
