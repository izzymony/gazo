import { cn } from "@vibaar/utils";

interface ListSectionHeaderProps {
  title: string;
  /** Heading level. Defaults to h2, matching Section. */
  titleAs?: "h2" | "h3" | "h4";
  /** Optional trailing action, e.g. { label: "See All", onClick }. */
  action?: { label: string; onClick: () => void };
  className?: string;
}

export default function ListSectionHeader({ title, action, titleAs: Heading = "h2", className }: ListSectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <Heading className="text-body font-medium text-foreground-primary">{title}</Heading>
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
