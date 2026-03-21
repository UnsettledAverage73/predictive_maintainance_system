import { cn } from "@/lib/utils";

interface RiskBadgeProps {
  score: number;
  className?: string;
}

export function RiskBadge({ score, className }: RiskBadgeProps) {
  let colorClass = "bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20";
  if (score >= 40 && score < 70) {
    colorClass = "bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20";
  } else if (score >= 70) {
    colorClass = "bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] border-[var(--color-destructive)]/20";
  }

  return (
    <span className={cn("px-2.5 py-0.5 rounded-full border text-xs font-medium font-mono", colorClass, className)}>
      {score}
    </span>
  );
}
