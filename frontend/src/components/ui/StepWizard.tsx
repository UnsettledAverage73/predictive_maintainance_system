"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StepWizardProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

export function StepWizard({ currentStep, totalSteps, labels }: StepWizardProps) {
  return (
    <div className="w-full flex items-center justify-between relative mb-8">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-[var(--color-surface)] rounded-full -z-10" />
      <div 
        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[var(--color-primary)] rounded-full -z-10 transition-all duration-300" 
        style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
      />
      
      {Array.from({ length: totalSteps }).map((_, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;
        
        return (
          <div key={stepNum} className="flex flex-col items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors",
              isCompleted ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-[#0D1117]" :
              isActive ? "bg-[var(--color-surface)] border-[var(--color-primary)] text-[var(--color-primary)] shadow-[0_0_10px_var(--color-primary)]" :
              "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-muted)]"
            )}>
              {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
            </div>
            <span className={cn(
              "text-xs font-medium uppercase tracking-wider",
              isActive ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]"
            )}>
              {labels[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
