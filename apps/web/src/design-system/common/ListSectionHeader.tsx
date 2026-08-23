import { cn } from "@/lib/utils";

interface ListSectionHeaderProps {
  title: string;
  /** Optional trailing action, e.g. { label: "See All", onClick }. */
  action?: { label: string; onClick: () => void };
  className?: string;
}

export default function ListSectionHeader({ title, action, className }: ListSectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <p className="text-body font-medium text-ink-90">{title}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="text-instaRed text-body-sm font-medium min-h-[36px] flex items-center">
          {action.label}
        </button>
      )}
    </div>
  );
}
