'use client';

import { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { TaskCard } from "@/components/schedule/TaskCard";
import { MaintenanceTask } from "@/types";
import { Filter, Calendar as CalendarIcon, Bot, Clock, AlertTriangle, Play, CheckCircle } from "lucide-react";
import { api, buildWebSocketUrl } from '@/lib/api';

const normalizeTask = (task: Partial<MaintenanceTask>): MaintenanceTask => {
  const assignedTo = task.assigned_to ?? task.assignedTo ?? 'Unassigned';
  const dueDate = task.due_date ?? task.dueDate ?? new Date().toISOString();
  const machineId = task.machine_id ?? task.machineId ?? '';
  const machineName = task.machine_name ?? task.machineName ?? (machineId || 'Unknown Machine');
  const taskName = task.task_name ?? task.title ?? 'Untitled Task';

  return {
    ...task,
    id: task.id ?? `task-${Date.now()}`,
    machine_id: machineId,
    machine_name: machineName,
    task_name: taskName,
    task_type: task.task_type ?? 'inspection',
    status: task.status ?? 'pending',
    due_date: dueDate,
    assigned_to: assignedTo,
    created_at: task.created_at ?? task.createdAt ?? new Date().toISOString(),
  } as MaintenanceTask;
};

export default function SchedulePage() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'in_progress' | 'completed'>('pending');

  useEffect(() => {
    const fetchSchedule = async () => {
      setIsLoading(true);
      try {
        const response = await api.getSchedule(true);
        setTasks(response.map(normalizeTask));
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to fetch schedule:", error);
        setIsLoading(false);
      }
    };

    fetchSchedule();

    // Real-time WebSocket Subscription
    const wsUrl = buildWebSocketUrl("/ws/schedule");
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const updatedTask = normalizeTask(JSON.parse(event.data));
      setTasks(prev => {
        const exists = prev.find(t => t.id === updatedTask.id);
        if (exists) {
          return prev.map(t => t.id === updatedTask.id ? updatedTask : t);
        } else {
          return [...prev, updatedTask].sort((a, b) => 
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          );
        }
      });
    };

    return () => ws.close();
  }, []);

  const onUpdateTask = async (taskId: number | string, status: string) => {
    try {
      await api.updateTask(taskId, { status });
      // The state will be updated via WebSocket message
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const criticalTasksCount = tasks.filter(t => t.priority === 'critical').length;

  if (isLoading && tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
        <div className="text-center font-mono text-[var(--color-muted)] animate-pulse">Computing Optimal Maintenance Trajectory...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Maintenance Schedule</h1>
          <p className="text-[var(--color-muted)] text-sm mt-1">AI-prioritized work orders for maximum plant uptime</p>
        </div>
        <div className="flex gap-3 items-center">
          <button 
            disabled={isLoading}
            onClick={() => {
              setIsLoading(true);
              api.getSchedule(true)
                .then(res => {
                  setTasks(res.map(normalizeTask));
                  setIsLoading(false);
                })
                .catch(error => {
                  console.error("Failed to refresh schedule:", error);
                  setIsLoading(false);
                });
            }}
            className={cn(
              "flex items-center gap-2 bg-[var(--color-primary)] text-black px-5 py-2.5 rounded-xl text-sm font-bold shadow-[0_0_20px_rgba(0,212,170,0.3)] hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:hover:scale-100",
              isLoading && "animate-pulse"
            )}
          >
            {isLoading ? <Clock className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            {isLoading ? "Analyzing..." : "AI Re-Prioritize"}
          </button>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: tasks.length, icon: CalendarIcon, color: 'var(--color-primary)' },
          { label: 'Critical Risk', value: criticalTasksCount, icon: AlertTriangle, color: 'var(--color-destructive)' },
          { label: 'In Progress', value: inProgressTasks.length, icon: Play, color: 'var(--color-warning)' },
          { label: 'Completed', value: completedTasks.length, icon: CheckCircle, color: 'var(--color-success)' },
        ].map((stat) => (
          <div key={stat.label} className="glass-panel p-4 rounded-2xl flex items-center gap-4 border-l-4" style={{ borderLeftColor: stat.color }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 shadow-inner">
               <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-[var(--color-muted)] tracking-widest">{stat.label}</p>
              <p className="text-xl font-black text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 py-3 border-y border-white/5 overflow-x-auto custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Filter className="w-4 h-4 text-[var(--color-muted)]" />
          <span className="text-sm font-semibold text-[var(--color-muted)] mr-2">Filters:</span>
        </div>
        <div className="flex items-center gap-3">
          {["All Assets", "Critical Only", "High Risk", "My Area"].map(f => (
            <span key={f} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer hover:border-[var(--color-primary)]/50 transition-all hover:bg-[var(--color-primary)]/5 active:scale-95">
              {f}
            </span>
          ))}
        </div>
        <div className="ml-auto snap-center shrink-0 flex bg-white/5 rounded-xl border border-white/10 p-1">
          <button className="px-3 py-1 rounded-lg bg-white/10 text-[10px] font-bold uppercase tracking-wider shadow-sm">Board</button>
          <button className="px-3 py-1 rounded-lg hover:bg-white/10 transition-colors text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">List</button>
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="flex md:hidden bg-[var(--color-surface)] p-1.5 rounded-xl border border-[var(--color-border)] gap-1 shadow-sm font-mono relative w-full items-stretch">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-3 text-xs font-bold tracking-widest rounded-lg transition-all ${activeTab === 'pending' ? 'bg-[#8B949E]/20 text-white shadow-sm' : 'text-[var(--color-muted)] hover:text-white'}`}
        >
          Pending <span className="ml-1 opacity-70">({pendingTasks.length})</span>
        </button>
        <button 
          onClick={() => setActiveTab('in_progress')}
          className={`flex-1 py-3 text-xs font-bold tracking-widest rounded-lg transition-all ${activeTab === 'in_progress' ? 'bg-[var(--color-warning)]/20 text-[var(--color-warning)] shadow-sm' : 'text-[var(--color-muted)] hover:text-white'}`}
        >
          Active <span className="ml-1 opacity-70">({inProgressTasks.length})</span>
        </button>
        <button 
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-3 text-xs font-bold tracking-widest rounded-lg transition-all ${activeTab === 'completed' ? 'bg-[var(--color-success)]/20 text-[var(--color-success)] shadow-sm' : 'text-[var(--color-muted)] hover:text-white'}`}
        >
          Done <span className="ml-1 opacity-70">({completedTasks.length})</span>
        </button>
      </div>

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative min-h-[50vh]">
        
        <div className={activeTab === 'pending' ? 'flex flex-col gap-4' : 'hidden md:flex flex-col gap-4'}>
          <div className="flex items-center justify-between bg-white/5 px-4 py-4 rounded-2xl border border-white/10 shadow-sm mb-2 group">
            <div className="flex items-center gap-3">
              <div className="w-2 h-6 bg-[#8B949E] rounded-full group-hover:h-8 transition-all" />
              <h3 className="font-black text-xs uppercase tracking-[0.2em] text-[#8B949E]">Queue</h3>
            </div>
            <span className="bg-[#8B949E]/10 text-[#8B949E] px-2.5 py-1 rounded-lg text-xs font-black border border-[#8B949E]/20">{pendingTasks.length}</span>
          </div>
          <div className="flex flex-col gap-4 pb-4">
            {pendingTasks.map((t) => <TaskCard key={t.id} task={t} onUpdate={onUpdateTask} />)}
            {pendingTasks.length === 0 && (
               <div className="p-12 text-center text-[var(--color-muted)] text-sm font-bold border-2 border-dashed border-white/5 rounded-3xl opacity-50">Empty Queue</div>
            )}
          </div>
        </div>

        <div className={activeTab === 'in_progress' ? 'flex flex-col gap-4' : 'hidden md:flex flex-col gap-4'}>
          <div className="flex items-center justify-between bg-white/5 px-4 py-4 rounded-2xl border border-white/10 shadow-sm mb-2 group">
            <div className="flex items-center gap-3">
              <div className="w-2 h-6 bg-[var(--color-warning)] rounded-full group-hover:h-8 transition-all shadow-[0_0_10px_var(--color-warning)]" />
              <h3 className="font-black text-xs uppercase tracking-[0.2em] text-[var(--color-warning)]">Active</h3>
            </div>
            <span className="bg-[var(--color-warning)]/10 text-[var(--color-warning)] px-2.5 py-1 rounded-lg text-xs font-black border border-[var(--color-warning)]/20">{inProgressTasks.length}</span>
          </div>
          <div className="flex flex-col gap-4 pb-4">
            {inProgressTasks.map((t) => <TaskCard key={t.id} task={t} onUpdate={onUpdateTask} />)}
            {inProgressTasks.length === 0 && (
               <div className="p-12 text-center text-[var(--color-muted)] text-sm font-bold border-2 border-dashed border-white/5 rounded-3xl opacity-50">No Active Operations</div>
            )}
          </div>
        </div>

        <div className={activeTab === 'completed' ? 'flex flex-col gap-4' : 'hidden md:flex flex-col gap-4'}>
          <div className="flex items-center justify-between bg-white/5 px-4 py-4 rounded-2xl border border-white/10 shadow-sm mb-2 group">
            <div className="flex items-center gap-3">
              <div className="w-2 h-6 bg-[var(--color-success)] rounded-full group-hover:h-8 transition-all shadow-[0_0_10px_var(--color-success)]" />
              <h3 className="font-black text-xs uppercase tracking-[0.2em] text-[var(--color-success)]">Resolved</h3>
            </div>
            <span className="bg-[var(--color-success)]/10 text-[var(--color-success)] px-2.5 py-1 rounded-lg text-xs font-black border border-[var(--color-success)]/20">{completedTasks.length}</span>
          </div>
          <div className="flex flex-col gap-4 pb-4">
            {completedTasks.map((t) => <TaskCard key={t.id} task={t} onUpdate={onUpdateTask} />)}
            {completedTasks.length === 0 && (
               <div className="p-12 text-center text-[var(--color-muted)] text-sm font-bold border-2 border-dashed border-white/5 rounded-3xl opacity-50">Archive Empty</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
