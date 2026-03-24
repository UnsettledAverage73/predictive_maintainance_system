import { MaintenanceTask } from "@/types";
import { cn } from "@/lib/utils";
import { CheckCircle, Play, Clock, HardDrive, Bot, AlertTriangle } from "lucide-react";

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

  const vibBreach = (task.vibration ?? 0) > (task.vibThreshold ?? 4.5);
  const tempBreach = (task.temperature ?? 0) > (task.tempThreshold ?? 100);

  const triggerAnomaly = async (param: 'temperature' | 'vibration_rms') => {
    try {
      await fetch(`/api/equipment/${task.machine_id}/trigger_anomaly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          parameter: param, 
          value: param === 'temperature' ? 128.5 : 8.4 
        })
      });
    } catch (err) {
      console.error("Demo trigger failed", err);
    }
  };

  return (
    <div className={cn(
      "glass-panel rounded-2xl p-4 flex flex-col gap-4 group hover:border-[var(--color-primary)]/50 transition-all duration-300 relative overflow-hidden",
      (task.status === 'overdue' || vibBreach || tempBreach) && "border-[var(--color-destructive)]/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]",
      className
    )}>
      {/* Background decoration */}
      <div className={cn(
        "absolute -right-6 -top-6 w-24 h-24 blur-3xl opacity-10 pointer-events-none transition-colors duration-500",
        (task.priority === 'critical' || vibBreach || tempBreach) ? "bg-red-500" : 
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
            {(task.priority || vibBreach || tempBreach) && (
               <span className={cn(
                "text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border leading-none tracking-wider whitespace-nowrap",
                (vibBreach || tempBreach) ? getPriorityColor('critical') : getPriorityColor(task.priority)
              )}>
                {(vibBreach || tempBreach) ? 'CRITICAL BREACH' : task.priority}
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
                  strokeDashoffset={113 - (113 * ( (vibBreach || tempBreach) ? 98 : riskScore) / 100)}
                  className={cn(
                    "transition-all duration-1000 ease-out",
                    (task.priority === 'critical' || vibBreach || tempBreach) ? "text-red-500" : 
                    task.priority === 'high' ? "text-amber-500" : "text-emerald-500"
                  )} 
                />
              </svg>
              <span className="absolute text-[10px] font-bold font-mono">{(vibBreach || tempBreach) ? 98 : riskScore}%</span>
           </div>
           <span className="text-[7px] uppercase font-bold text-[var(--color-muted)] tracking-widest">Risk</span>
        </div>
      </div>

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

      {/* Important Points Section - ISO 14224 Precise Output Alignment */}
      <div className={cn(
        "p-3.5 bg-gradient-to-br rounded-xl border flex flex-col gap-3 relative overflow-hidden group/ai shadow-inner transition-all duration-500",
        (vibBreach || tempBreach) 
          ? "from-red-500/20 to-transparent border-red-500/40" 
          : "from-[var(--color-primary)]/10 to-transparent border-[var(--color-primary)]/20"
      )}>
        <div className={cn(
          "absolute inset-0 opacity-0 group-hover/ai:opacity-100 transition-opacity animate-pulse pointer-events-none",
          (vibBreach || tempBreach) ? "bg-red-500/5" : "bg-[var(--color-primary)]/5"
        )} />
        
        <div className="flex items-center gap-2 relative z-10">
          <Bot className={cn("w-4 h-4", (vibBreach || tempBreach) ? "text-red-400" : "text-[var(--color-primary)]")} />
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-[0.2em]",
            (vibBreach || tempBreach) ? "text-red-400" : "text-[var(--color-primary)]"
          )}>
            {(vibBreach || tempBreach) ? 'CRITICAL SYSTEM BREACH' : 'Important Points'}
          </span>
          <div className={cn("h-px flex-1", (vibBreach || tempBreach) ? "bg-red-500/20" : "bg-[var(--color-primary)]/20")} />
        </div>

        <ul className="space-y-2 relative z-10">
          <li className="text-[11px] text-slate-300 flex items-start gap-2.5">
            <div className={cn("w-1.5 h-1.5 rounded-full mt-1 shrink-0", (vibBreach || tempBreach) ? "bg-red-500/60" : "bg-[var(--color-primary)]/60")} />
            <span>
              <span className="font-black text-white uppercase text-[9px] tracking-wider mr-1">Raw Data:</span> 
              Vibration = <span className={cn("font-mono font-bold", vibBreach ? "text-red-400 animate-pulse" : "text-white")}>
                {(task.vibration ?? 0).toFixed(2)} mm/s
              </span> 
              {vibBreach && <span className="text-[8px] text-red-400 ml-1 font-black underline">LIMIT EXCEEDED</span>}, 
              Temperature = <span className={cn("font-mono font-bold", tempBreach ? "text-red-400 animate-pulse" : "text-white")}>
                {(task.temperature ?? 0).toFixed(1)}°C
              </span>
              {tempBreach && <span className="text-[8px] text-red-400 ml-1 font-black underline">CRITICAL THRESHOLD</span>}
            </span>
          </li>
          <li className="text-[11px] text-slate-300 flex items-start gap-2.5">
            <div className={cn("w-1.5 h-1.5 rounded-full mt-1 shrink-0", (vibBreach || tempBreach) ? "bg-red-500/60" : "bg-[var(--color-primary)]/60")} />
            <span><span className="font-black text-white uppercase text-[9px] tracking-wider mr-1">Asset Logic:</span> Equipment = <span className="text-white">{machineName}</span>, Failure Mode = <span className={cn("text-white font-bold", (vibBreach || tempBreach) && "text-red-400 underline")}>{task.failureMode || 'Anomaly'}</span>, Action = <span className="text-white">{task.maintenanceAction || 'Inspection'}</span></span>
          </li>
          <li className="text-[11px] text-slate-300 flex items-start gap-2.5">
            <div className={cn("w-1.5 h-1.5 rounded-full mt-1 shrink-0", (vibBreach || tempBreach) ? "bg-red-500/60" : "bg-[var(--color-primary)]/60")} />
            <span><span className="font-black text-white uppercase text-[9px] tracking-wider mr-1">Risk Matrix:</span> Probability of failure = <span className={cn(
              "font-mono font-bold",
              ((task.failureProbability || 0) > 80 || vibBreach || tempBreach) ? "text-red-400" : "text-[var(--color-primary)]"
            )}>{(vibBreach || tempBreach) ? 98 : (task.failureProbability || 0)}%</span></span>
          </li>
          <li className={cn(
            "text-[11px] italic mt-1.5 pl-3 border-l-2 leading-relaxed bg-white/5 py-2 rounded-r-lg transition-colors",
            (vibBreach || tempBreach) ? "border-red-500/50 text-red-100" : "border-[var(--color-primary)]/30 text-slate-200"
          )}>
            <span className={cn(
              "font-black uppercase text-[9px] tracking-widest not-italic block mb-0.5",
              (vibBreach || tempBreach) ? "text-red-400" : "text-[var(--color-primary)]"
            )}>LLM Recommendation</span>
            &quot;{(vibBreach || tempBreach) ? `CRITICAL: ${task.failureMode} detected. Shutdown protocol recommended immediately.` : (task.aiReason || recommendedAction || 'Proceed with standard inspection protocol.')}&quot;
          </li>
        </ul>
      </div>

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
          <button 
            onClick={(e) => { e.stopPropagation(); triggerAnomaly('temperature'); }}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/10 text-red-500 border border-red-500/20 text-[8px] font-bold uppercase tracking-tighter hover:bg-red-500/30 transition-all opacity-0 group-hover:opacity-100"
          >
            <AlertTriangle className="w-2.5 h-2.5" /> Demo Critical
          </button>
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
