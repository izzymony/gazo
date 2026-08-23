import { cn } from "@/lib/utils";

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
        "w-full p-2 border border-ink-10 rounded-field text-body text-ink-90 placeholder:text-ink-40 focus:outline-none focus:border-instaRed",
        className
      )}
    />
  );
}
