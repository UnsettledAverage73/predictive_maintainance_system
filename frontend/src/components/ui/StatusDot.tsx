import { cn } from "@/lib/utils";

interface StatusDotProps {
  status: 'online' | 'warning' | 'critical' | 'offline';
  className?: string;
}

export function StatusDot({ status, className }: StatusDotProps) {
  const getColors = () => {
    switch (status) {
      case 'online':
        return "bg-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary)] animate-pulse";
      case 'warning':
        return "bg-[var(--color-warning)] shadow-[0_0_8px_var(--color-warning)]";
      case 'critical':
        return "bg-[var(--color-destructive)] shadow-[0_0_8px_var(--color-destructive)] animate-pulse";
      case 'offline':
      default:
        return "bg-gray-500 shadow-none";
    }
  };

  return (
    <span className="relative flex h-3 w-3">
      {status === 'online' && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary)] opacity-75"></span>
      )}
      <span className={cn("relative inline-flex rounded-full h-3 w-3", getColors(), className)}></span>
    </span>
  );
}
