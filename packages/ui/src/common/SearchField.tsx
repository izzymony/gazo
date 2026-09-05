import { cn } from "@vibaar/utils";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchField({ value, onChange, placeholder = "Search", className }: SearchFieldProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full p-2 border border-outline rounded-field text-body text-foreground-primary placeholder:text-foreground-muted focus:outline-none focus:border-brandDeep",
        className
      )}
    />
  );
}
