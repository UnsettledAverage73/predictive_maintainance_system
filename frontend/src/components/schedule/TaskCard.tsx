import { MaintenanceTask } from "@/types";
import { cn } from "@/lib/utils";
import { CheckCircle, Play, Clock, User, HardDrive } from "lucide-react";

interface TaskCardProps {
  task: MaintenanceTask;
  className?: string;
  onUpdate?: (id: number, status: MaintenanceTask['status']) => void;
}

export function TaskCard({ task, className, onUpdate }: TaskCardProps) {
  const getStatusColor = (status: MaintenanceTask['status']) => {
    switch (status) {
      case 'completed': return 'text-[var(--color-success)] border-[var(--color-success)]/30 bg-[var(--color-success)]/10';
      case 'in_progress': return 'text-[var(--color-warning)] border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10';
      case 'overdue': return 'text-[var(--color-destructive)] border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10';
      default: return 'text-[var(--color-muted)] border-[var(--color-border)] bg-[var(--color-surface)]';
    }
  };

  const getTaskIcon = (type: MaintenanceTask['task_type']) => {
    switch (type) {
      case 'repair': return '🛠️';
      case 'inspection': return '🔍';
      default: return '⚙️';
    }
  };

  return (
    <div className={cn(
      "glass-panel rounded-xl p-4 flex flex-col gap-3 group hover:border-[var(--color-primary)]/50 transition-all duration-300",
      task.status === 'overdue' && "border-[var(--color-destructive)]/30 shadow-[0_0_15px_var(--color-destructive)]/10",
      className
    )}>
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[var(--color-muted)] flex items-center gap-1">
              <HardDrive className="w-3 h-3" /> {task.machine_name}
            </span>
            <span className={cn(
              "text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border leading-none",
              getStatusColor(task.status)
            )}>
              {task.status}
            </span>
          </div>
          <h4 className="font-bold text-sm text-[var(--color-foreground)] flex items-center gap-2">
            <span>{getTaskIcon(task.task_type)}</span>
            {task.task_name}
          </h4>
        </div>
      </div>

      {task.notes && (
        <div className="text-xs text-[var(--color-muted)] italic border-l-2 border-[var(--color-border)] pl-2 py-1">
          "{task.notes}"
        </div>
      )}

      <div className="flex items-center justify-between mt-2 pt-3 border-t border-[var(--color-border)]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[var(--color-muted)]">
            <Clock className="w-3 h-3" />
            <span className="text-[10px] uppercase font-mono">{new Date(task.due_date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--color-muted)]">
            <User className="w-3 h-3" />
            <span className="text-[10px] uppercase font-mono">{task.assigned_to}</span>
          </div>
        </div>

        <div className="flex gap-2">
          {task.status === 'pending' && onUpdate && (
            <button 
              onClick={(e) => { e.stopPropagation(); onUpdate(task.id, 'in_progress'); }}
              className="p-2 rounded-lg bg-[var(--color-warning)]/10 text-[var(--color-warning)] hover:bg-[var(--color-warning)]/20 transition-colors border border-[var(--color-warning)]/20"
              title="Start Task"
            >
              <Play className="w-4 h-4 fill-current" />
            </button>
          )}
          {task.status === 'in_progress' && onUpdate && (
            <button 
              onClick={(e) => { e.stopPropagation(); onUpdate(task.id, 'completed'); }}
              className="p-2 rounded-lg bg-[var(--color-success)]/10 text-[var(--color-success)] hover:bg-[var(--color-success)]/20 transition-colors border border-[var(--color-success)]/20"
              title="Complete Task"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
