import { IoCheckmark } from "../icons";
import { cn } from "@vibaar/utils";

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** When set, renders the labeled checkmark style; omit for the standalone box. */
  label?: string;
  /** Box variant only: round vs. rounded-square (was the separate CustomCheckbox). */
  isRound?: boolean;
};

/**
 * Unified checkbox primitive — labeled (checkmark + text) or standalone box.
 * Selection cue matches RadioGroup: neutral ink-30 ring when unchecked, brand
 * brand fill + white check when checked.
 */
const Checkbox = ({ checked, onChange, label, isRound = false }: CheckboxProps) => {
  // Standalone box (was CustomCheckbox) — no label.
  if (!label) {
    return (
      <div
        onClick={() => onChange(!checked)}
        className={cn(
          "w-5 h-5 border-2 flex items-center justify-center cursor-pointer transition-colors flex-shrink-0",
          isRound ? "rounded-full" : "rounded",
          checked ? "bg-brand border-brandDeep" : "border-ink-30"
        )}>
        {checked && (
          <IoCheckmark className="text-white" size={14} strokeWidth={3} />
        )}
      </div>
    );
  }

  // Labeled checkmark style.
  return (
    <div
      onClick={() => onChange(!checked)}
      className="flex items-center cursor-pointer gap-2">
      <div
        className={cn(
          "w-5 h-5 flex items-center justify-center rounded border-2 transition-colors flex-shrink-0",
          checked ? "bg-brand border-brandDeep" : "border-ink-30"
        )}>
        {checked && (
          <IoCheckmark className="text-white" size={14} strokeWidth={3} />
        )}
      </div>
      <span className="text-ink-90 text-body">{label}</span>
    </div>
  );
};

export default Checkbox;
