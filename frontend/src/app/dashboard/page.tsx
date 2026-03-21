'use client';

import { useState, useEffect } from "react";
import { MachineCard } from "@/components/machines/MachineCard";
import { MachineCardSkeleton } from "@/components/machines/MachineCardSkeleton";
import { Machine, Alert } from "@/types";
import { Activity, AlertTriangle, Calendar, Settings2, Sparkles, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function DashboardPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [stats, setStats] = useState({ globalRisk: 0, activeAlerts: 0, avgHealth: 100, factoryStatus: 'Optimal' });
  const [recommendations, setRecommendations] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [equipmentData, factoryStats, alertsData] = await Promise.all([
          api.getEquipment(),
          api.getFactoryStats(),
          api.getAlerts()
        ]);
        setMachines(equipmentData);
        setStats(factoryStats);
        
        // Map backend ai_alerts to frontend Alert type for recommendations
        const mappedAlerts: Alert[] = alertsData.slice(0, 3).map((a: any) => ({
          id: a.id.toString(),
          machineId: a.equipment_id,
          machineName: a.equipment_id,
          severity: a.severity.toLowerCase() as any,
          title: a.reason,
          description: "Tactical anomaly detected.",
          aiAnalysis: a.prescription,
          status: "new",
          createdAt: a.timestamp
        }));
        setRecommendations(mappedAlerts);
        
        setIsLoading(false);
        setIsLive(true);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5s

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-8 xl:pb-12 w-full max-w-[1600px] mx-auto overflow-x-hidden">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plant Overview</h1>
          <p className="text-[var(--color-muted)] text-sm flex items-center gap-2 mt-1">
            <span className="relative flex h-2 w-2">
              {isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-[var(--color-success)]' : 'bg-slate-500'}`}></span>
            </span>
            {isLive ? 'Live Telemetry feed active' : 'Connecting to fleet...'}
          </p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: "Total Machines", value: isLoading ? "-" : machines.length, icon: Settings2, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "Active Alerts", value: isLoading ? "-" : stats.activeAlerts, icon: AlertTriangle, color: "text-[var(--color-warning)]", bg: "bg-amber-500/10 border-amber-500/20" },
          { label: "Factory Status", value: isLoading ? "-" : stats.factoryStatus, icon: Calendar, color: "text-[var(--color-info)]", bg: "bg-blue-400/10 border-blue-400/20" },
          { label: "Avg Health Score", value: isLoading ? "-" : `${stats.avgHealth}%`, icon: Activity, color: "text-[var(--color-destructive)]", bg: "bg-red-500/10 border-red-500/20" },
        ].map((kpi, i) => (
          <div key={i} className="bg-[var(--color-surface)] border border-[var(--color-border)] p-3 md:p-4 rounded-xl flex items-start sm:items-center justify-between flex-col-reverse sm:flex-row gap-2 sm:gap-0 shadow-sm">
            <div className="flex flex-col w-full">
              <span className="text-[var(--color-muted)] text-[10px] md:text-xs uppercase font-bold tracking-wider truncate">{kpi.label}</span>
              <span className="text-2xl md:text-3xl font-bold font-mono mt-1 text-[var(--color-foreground)]">{kpi.value}</span>
            </div>
            <div className={`p-2 sm:p-3 rounded-full ${kpi.bg} ${kpi.color} self-end sm:self-auto`}>
              <kpi.icon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col xl:flex-row-reverse gap-6">
        {/* AI Recommendations Panel */}
        <div className="w-full xl:w-[380px] 2xl:w-[420px] flex-shrink-0 flex flex-col min-w-0">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--color-muted)] mb-3 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
              Orchestrator Insights
            </span>
            <Link href="/dashboard/alerts" className="text-[10px] text-[var(--color-primary)] hover:underline">View All</Link>
          </h2>
          
          <div className="flex flex-row xl:flex-col gap-4 overflow-x-auto xl:overflow-x-visible pb-4 xl:pb-0 snap-x custom-scrollbar -mx-4 px-4 xl:mx-0 xl:px-0">
            {recommendations.length > 0 ? recommendations.map((rec, i) => (
              <div key={rec.id} className={cn(
                "w-[85vw] sm:w-[320px] xl:w-full flex-shrink-0 snap-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 border-l-[3px] shadow-md min-h-[160px] flex flex-col transition-all hover:border-[var(--color-primary)]/30",
                rec.severity === 'critical' ? "border-l-[var(--color-destructive)]" : "border-l-[var(--color-warning)]"
              )}>
                <div className="flex justify-between items-start mb-2">
                  <span className={cn(
                    "text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                    rec.severity === 'critical' ? "text-[var(--color-destructive)] bg-red-500/10" : "text-[var(--color-warning)] bg-amber-500/10"
                  )}>
                    {rec.machineId} \u2022 {rec.severity}
                  </span>
                  <span className="text-[10px] text-[var(--color-muted)] font-mono">{new Date(rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-sm font-medium leading-relaxed text-[var(--color-foreground)] flex-1 line-clamp-3">{rec.aiAnalysis}</p>
                <Link 
                  href={`/dashboard/machines/${rec.machineId}`}
                  className="mt-4 text-xs font-semibold bg-[var(--color-primary)] text-black px-4 py-2 rounded-md hover:brightness-110 transition-all self-start shadow-[0_2px_10px_rgba(0,212,170,0.2)] flex items-center gap-2"
                >
                  Investigate Asset <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )) : (
              <div className="w-[85vw] sm:w-[320px] xl:w-full flex-shrink-0 snap-center bg-[var(--color-surface)]/50 border border-dashed border-[var(--color-border)] rounded-xl p-8 flex flex-col items-center justify-center text-center">
                <Sparkles className="w-8 h-8 text-[var(--color-muted)] mb-3 opacity-20" />
                <p className="text-xs text-[var(--color-muted)]">No critical prescriptions generated. System baseline is nominal.</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Grid */}
        <div className="flex-1 min-w-0 flex flex-col">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--color-muted)] mb-3">Machine Fleet</h2>
          <div 
            className="grid gap-4 xl:gap-5" 
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
          >
            {isLoading 
              ? Array.from({ length: 6 }).map((_, i) => <MachineCardSkeleton key={i} />)
              : machines.map(machine => (
                  <MachineCard key={machine.id} machine={machine} />
                ))
            }
          </div>
        </div>
      </div>
      
    </div>
  );
}

