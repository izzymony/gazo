interface StepNavigationProps {
  step: number;
  totalSteps: number;
}

export default function StepNavigation({
  step,
  totalSteps,
}: StepNavigationProps) {
  return (
    <div className={`flex flex-row space-x-2 w-full mt-3`}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={`h-1 flex-1 rounded-pill transition-colors ${step >= index + 1 ? "bg-brand" : "bg-ink-10"
            }`}
        />
      ))}
    </div>
  );
}
