import { cn } from "@/lib/utils";
import type { PhotoshootStep } from "@/types";
import { PHOTOSHOOT_STEPS } from "@/lib/mock/constants";

interface StepIndicatorProps {
  currentStep: PhotoshootStep;
  className?: string;
}

export function StepIndicator({ currentStep, className }: StepIndicatorProps) {
  const currentIndex = PHOTOSHOOT_STEPS.findIndex((s) => s.id === currentStep);

  return (
    <nav aria-label="Photoshoot progress" className={cn("w-full", className)}>
      <ol className="flex items-center justify-between gap-1">
        {PHOTOSHOOT_STEPS.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <li key={step.id} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {index > 0 && (
                  <div
                    className={cn(
                      "h-px flex-1",
                      isCompleted || isActive ? "bg-stone-900" : "bg-stone-200",
                    )}
                  />
                )}
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-medium transition-colors sm:h-8 sm:w-8 sm:text-xs",
                    isActive && "bg-stone-900 text-white",
                    isCompleted && "bg-stone-900 text-white",
                    isUpcoming && "bg-stone-100 text-stone-400",
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  {step.number}
                </div>
                {index < PHOTOSHOOT_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-px flex-1",
                      isCompleted ? "bg-stone-900" : "bg-stone-200",
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "mt-2 hidden text-center text-[10px] lg:block lg:text-xs",
                  isActive ? "font-medium text-stone-900" : "text-stone-400",
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-center text-sm text-stone-500 sm:hidden">
        Step {currentIndex + 1} of {PHOTOSHOOT_STEPS.length}:{" "}
        <span className="font-medium text-stone-900">
          {PHOTOSHOOT_STEPS[currentIndex]?.label}
        </span>
      </p>
    </nav>
  );
}
