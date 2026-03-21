import { cn } from "@/lib/utils";
import { BrainCircuit } from "lucide-react";

interface AgentPanelProps {
  analysis: string;
  confidence: number;
  className?: string;
}

export function AgentPanel({ analysis, confidence, className }: AgentPanelProps) {
  return (
    <div className={cn(
      "glass-panel p-5 rounded-xl border-l-4 border-l-[var(--color-primary)] relative overflow-hidden",
      className
    )}>
      <div className="flex items-center gap-2 mb-3 text-[var(--color-primary)]">
        <BrainCircuit className="w-5 h-5" />
        <h3 className="font-semibold">AI Agent Analysis</h3>
      </div>
      
      <p className="text-sm leading-relaxed mb-4 text-[var(--color-foreground)]">
        {analysis}
      </p>
      
      <div className="flex items-center justify-between text-xs mt-4 pt-4 border-t border-[var(--color-border)]">
        <span className="text-[var(--color-muted)]">Confidence Score</span>
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--color-primary)] rounded-full" 
              style={{ width: `${confidence}%` }}
            />
          </div>
          <span className="font-mono text-[var(--color-primary)]">{confidence}%</span>
        </div>
      </div>
    </div>
  );
}
