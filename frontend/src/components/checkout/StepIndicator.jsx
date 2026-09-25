import { Check, Loader2 } from "lucide-react";

export default function StepIndicator({ currentStep, steps = [] }) {
  if (steps.length === 0) {
    steps = ["Shipping", "Payment", "Confirm"];
  }

  return (
    <div className="flex items-center justify-between gap-2 mb-8">
      {steps.map((step, index) => {
        const stepNum = index + 1;
        const isCompleted = currentStep > stepNum;
        const isCurrent = currentStep === stepNum;
        const isUpcoming = currentStep < stepNum;

        return (
          <div key={step} className="flex-1">
            <div className="flex items-center gap-2">
              {/* Step circle */}
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-semibold
                  transition-all duration-300
                  ${isCompleted ? "bg-primary text-white" : ""}
                  ${isCurrent ? "bg-primary text-white ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}
                  ${isUpcoming ? "bg-muted text-muted-foreground border border-border" : ""}
                `}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : isCurrent ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  stepNum
                )}
              </div>

              {/* Step label */}
              <span
                className={`
                  text-sm font-medium whitespace-nowrap
                  ${isCompleted || isCurrent ? "text-primary" : "text-muted-foreground"}
                `}
              >
                {step}
              </span>

              {/* Connector line (not on last step) */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    flex-1 h-1 mx-2 rounded-full
                    transition-all duration-300
                    ${isCompleted ? "bg-primary" : "bg-muted"}
                  `}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
