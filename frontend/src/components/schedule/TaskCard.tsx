import { MaintenanceTask } from "@/types";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: MaintenanceTask;
  className?: string;
  view?: 'board' | 'list';
}

export function TaskCard({ task, className, view = 'board' }: TaskCardProps) {
  const isBoard = view === 'board';
  
  return (
    <div className={cn(
      "glass-panel rounded-xl p-4 flex flex-col gap-3 group hover:border-[var(--color-primary)]/50 transition-colors cursor-pointer",
      isBoard ? "w-full" : "flex-row items-center justify-between",
      className
    )}>
      <div className={cn(isBoard ? "flex flex-col gap-1" : "flex-1 flex flex-col gap-1")}>
        <div className="flex justify-between items-start">
          <span className="text-xs font-mono text-[var(--color-muted)]">{task.machineName}</span>
          {isBoard && <span className={cn(
            "text-[10px] uppercase font-bold px-2 py-0.5 rounded border",
            task.priority === 'critical' ? "bg-[var(--color-destructive)]/10 border-[var(--color-destructive)]/20 text-[var(--color-destructive)]" :
            task.priority === 'high' ? "bg-[var(--color-warning)]/10 border-[var(--color-warning)]/20 text-[var(--color-warning)]" :
            "bg-[var(--color-info)]/10 border-[var(--color-info)]/20 text-[var(--color-info)]"
          )}>{task.priority}</span>}
        </div>
        <h4 className="font-semibold text-sm leading-tight text-[var(--color-foreground)]">{task.title}</h4>
      </div>

      {isBoard && (
        <div className="text-xs text-[var(--color-muted)] border-l-2 border-[var(--color-primary)] pl-2">
          {task.aiReason}
        </div>
      )}

      <div className={cn(
        "flex text-xs items-center gap-3",
        isBoard ? "justify-between mt-2 pt-3 border-t border-[var(--color-border)]" : "w-1/3 justify-end"
      )}>
        <div className="flex flex-col">
          <span className="text-[var(--color-muted)] text-[10px] uppercase">Due Date</span>
          <span className="font-mono text-[var(--color-foreground)]">{new Date(task.dueDate).toLocaleDateString()}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[var(--color-muted)] text-[10px] uppercase">Assignee</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center text-[10px] font-bold text-[var(--color-primary)]">
              {task.assignedTo.charAt(0)}
            </div>
            <span className="text-[var(--color-foreground)]">{task.assignedTo}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
