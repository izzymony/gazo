interface StepNavigationProps {
  step: number;
  totalSteps: number;
}

export default function StepNavigation({
  step,
  totalSteps,
}: StepNavigationProps) {
  return (
    <div
      // Was a row of bare divs, so "step 2 of 4" existed only as colour.
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-valuenow={step}
      aria-valuetext={`Step ${step} of ${totalSteps}`}
      className={`flex flex-row space-x-2 w-full mt-3`}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className={`h-1 flex-1 rounded-pill transition-colors ${step >= index + 1 ? "bg-brand" : "bg-surface-strong"
            }`}
        />
      ))}
    </div>
  );
}
