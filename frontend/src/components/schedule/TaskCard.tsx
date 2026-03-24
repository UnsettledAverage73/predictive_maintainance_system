import { MaintenanceTask } from "@/types";
import { cn } from "@/lib/utils";
import { CheckCircle, Play, Clock, HardDrive, Bot } from "lucide-react";

interface TaskCardProps {
  task: MaintenanceTask;
  className?: string;
  onUpdate?: (id: number, status: MaintenanceTask['status']) => void;
}

export function TaskCard({ task, className, onUpdate }: TaskCardProps) {
  const assignee = task.assigned_to || task.assignedTo || 'Unassigned';
  const assigneeInitial = assignee.charAt(0).toUpperCase() || '?';
  const assigneeLabel = assignee.split(' ')[0] || 'Unassigned';
  const dueDate = task.due_date || task.dueDate;
  const machineName = task.machine_name || task.machineName || task.machine_id || task.machineId;
  const taskName = task.task_name || task.title || 'Untitled Task';
  const priorityScore = task.priorityScore ?? null;
  const recommendedAction = task.recommendedAction ?? null;

  const getStatusColor = (status: MaintenanceTask['status']) => {
    switch (status) {
      case 'completed': return 'text-[var(--color-success)] border-[var(--color-success)]/30 bg-[var(--color-success)]/10';
      case 'in_progress': return 'text-[var(--color-warning)] border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10';
      case 'overdue': return 'text-[var(--color-destructive)] border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10';
      default: return 'text-[var(--color-muted)] border-[var(--color-border)] bg-[var(--color-surface)]';
    }
  };

  const getPriorityColor = (priority: MaintenanceTask['priority']) => {
    switch (priority) {
      case 'critical': return 'bg-[var(--color-destructive)]/20 text-[var(--color-destructive)] border-[var(--color-destructive)]/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]';
      case 'high': return 'bg-[var(--color-warning)]/20 text-[var(--color-warning)] border-[var(--color-warning)]/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]';
      case 'medium': return 'bg-[var(--color-info)]/20 text-[var(--color-info)] border-[var(--color-info)]/30';
      default: return 'bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-border)]';
    }
  };

  const getTaskIcon = (type: MaintenanceTask['task_type']) => {
    switch (type) {
      case 'repair': return '🛠️';
      case 'inspection': return '🔍';
      default: return '⚙️';
    }
  };

  // Logic to derive risk score
  const riskScore = task.priority === 'critical' ? 92 : task.priority === 'high' ? 74 : task.priority === 'medium' ? 48 : 22;

  return (
    <div className={cn(
      "glass-panel rounded-2xl p-4 flex flex-col gap-4 group hover:border-[var(--color-primary)]/50 transition-all duration-300 relative overflow-hidden",
      task.status === 'overdue' && "border-[var(--color-destructive)]/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]",
      className
    )}>
      {/* Background decoration */}
      <div className={cn(
        "absolute -right-6 -top-6 w-24 h-24 blur-3xl opacity-10 pointer-events-none transition-colors duration-500",
        task.priority === 'critical' ? "bg-red-500" : 
        task.priority === 'high' ? "bg-amber-500" : "bg-emerald-500"
      )} />

      <div className="flex justify-between items-start relative z-10">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-[var(--color-muted)] shrink-0">
              <HardDrive className="w-3 h-3" /> {machineName}
            </div>
            <span className={cn(
              "text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border leading-none tracking-wider whitespace-nowrap",
              getStatusColor(task.status)
            )}>
              {task.status.replace('_', ' ')}
            </span>
            {task.priority && (
               <span className={cn(
                "text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border leading-none tracking-wider whitespace-nowrap",
                getPriorityColor(task.priority)
              )}>
                {task.priority}
              </span>
            )}
          </div>
          <h4 className="font-bold text-base text-[var(--color-foreground)] flex items-center gap-2 mt-1 truncate">
            <span className="text-xl shrink-0">{getTaskIcon(task.task_type)}</span>
            <span className="truncate">{taskName}</span>
          </h4>
        </div>

        {/* Risk Score Circle */}
        <div className="flex flex-col items-center gap-1 shrink-0 ml-2">
           <div className="relative w-11 h-11 flex items-center justify-center">
              <svg className="w-11 h-11 transform -rotate-90">
                <circle cx="22" cy="22" r="18" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-white/5" />
                <circle cx="22" cy="22" r="18" stroke="currentColor" strokeWidth="3" fill="transparent" 
                  strokeDasharray={113}
                  strokeDashoffset={113 - (113 * riskScore / 100)}
                  className={cn(
                    "transition-all duration-1000 ease-out",
                    task.priority === 'critical' ? "text-red-500" : 
                    task.priority === 'high' ? "text-amber-500" : "text-emerald-500"
                  )} 
                />
              </svg>
              <span className="absolute text-[10px] font-bold font-mono">{riskScore}%</span>
           </div>
           <span className="text-[7px] uppercase font-bold text-[var(--color-muted)] tracking-widest">Risk</span>
        </div>
      </div>

      {task.aiReason && (
        <div className="p-3 bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent rounded-xl border border-[var(--color-primary)]/20 flex gap-3 items-start relative overflow-hidden group/ai shadow-inner">
          <div className="absolute inset-0 bg-[var(--color-primary)]/5 opacity-0 group-hover/ai:opacity-100 transition-opacity animate-pulse pointer-events-none" />
          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/20 flex items-center justify-center shrink-0 border border-[var(--color-primary)]/30 shadow-sm">
            <Bot className="w-4.5 h-4.5 text-[var(--color-primary)]" />
          </div>
          <div className="flex flex-col gap-1 relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-widest">AI Intelligence</span>
              <div className="h-px flex-1 bg-[var(--color-primary)]/20" />
            </div>
            <p className="text-[12px] text-slate-200 leading-relaxed font-medium">
              {task.aiReason}
            </p>
          </div>
        </div>
      )}

      {(priorityScore !== null || recommendedAction || (task.blockingFactors && task.blockingFactors.length > 0)) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-mono uppercase tracking-wider">
          {priorityScore !== null && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <span className="text-[var(--color-muted)]">Priority Score</span>
              <div className="mt-1 text-sm font-black text-white">{priorityScore}</div>
            </div>
          )}
          {recommendedAction && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 sm:col-span-2">
              <span className="text-[var(--color-muted)]">Recommended Action</span>
              <div className="mt-1 text-sm font-black text-white">{recommendedAction}</div>
            </div>
          )}
          {task.blockingFactors && task.blockingFactors.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 sm:col-span-3">
              <span className="text-amber-300">Blockers</span>
              <div className="mt-1 text-[11px] font-bold text-slate-200 normal-case tracking-normal">{task.blockingFactors.join(", ")}</div>
            </div>
          )}
        </div>
      )}

      {task.notes && (
        <div className="text-xs text-[var(--color-muted)] italic bg-white/5 p-2.5 rounded-xl border-l-2 border-[var(--color-border)] pl-3">
          &quot;{task.notes}&quot;
        </div>
      )}

      <div className="flex items-center justify-between mt-1 pt-3 border-t border-white/5">
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-1.5 text-[var(--color-muted)] group-hover:text-slate-300 transition-colors">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold font-mono tracking-tight uppercase">{new Date(dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--color-muted)] group-hover:text-slate-300 transition-colors">
            <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-bold shadow-sm">
              {assigneeInitial}
            </div>
            <span className="text-[10px] font-bold font-mono tracking-tight uppercase">{assigneeLabel}</span>
          </div>
        </div>

        <div className="flex gap-2">
          {task.status === 'pending' && onUpdate && (
            <button 
              onClick={(e) => { e.stopPropagation(); onUpdate(task.id, 'in_progress'); }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-all border border-amber-500/20 font-bold text-[10px] uppercase tracking-wider active:scale-95 shadow-sm"
            >
              <Play className="w-3 h-3 fill-current" /> Start
            </button>
          )}
          {task.status === 'in_progress' && onUpdate && (
            <button 
              onClick={(e) => { e.stopPropagation(); onUpdate(task.id, 'completed'); }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all border border-emerald-500/20 font-bold text-[10px] uppercase tracking-wider active:scale-95 shadow-sm"
            >
              <CheckCircle className="w-3 h-3" /> Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
