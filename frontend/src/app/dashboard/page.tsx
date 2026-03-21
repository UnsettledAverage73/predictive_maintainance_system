'use client';

import { useState, useEffect } from "react";
import { MachineCard } from "@/components/machines/MachineCard";
import { MachineUsageChart } from "@/components/charts/MachineUsageChart";
import { MachineCardSkeleton } from "@/components/machines/MachineCardSkeleton";
import { Machine, Alert } from "@/types";
import { Activity, AlertTriangle, ArrowRight, Calendar, Radar, Settings2, ShieldCheck, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import Link from "next/link";

type FactoryStats = {
  globalRisk?: number;
  activeAlerts: number;
  avgHealth: number;
  factoryStatus: string;
};

type BackendAlert = {
  id: string | number;
  equipment_id: string;
  severity: string;
  reason: string;
  prescription: string;
  timestamp: string;
};

const normalizeSeverity = (severity: string): Alert["severity"] => {
  const normalized = severity.toLowerCase();
  if (normalized === "critical" || normalized === "warning" || normalized === "info") {
    return normalized;
  }

  return "info";
};

export default function DashboardPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [stats, setStats] = useState<FactoryStats>({ globalRisk: 0, activeAlerts: 0, avgHealth: 100, factoryStatus: 'Optimal' });
  const [recommendations, setRecommendations] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [equipmentData, factoryStats, alertsData] = await Promise.all([
          api.getEquipment() as Promise<Machine[]>,
          api.getFactoryStats() as Promise<FactoryStats>,
          api.getAlerts() as Promise<BackendAlert[]>
        ]);
        setMachines(equipmentData);
        setStats(factoryStats);
        
        const mappedAlerts: Alert[] = alertsData.slice(0, 3).map((a) => ({
          id: a.id.toString(),
          machineId: a.equipment_id,
          machineName: a.equipment_id,
          severity: normalizeSeverity(a.severity),
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

      <section className="surface-card hairline overflow-hidden rounded-[28px] p-5 md:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-primary)]">
                Live Operations
              </span>
              <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--color-muted)]">
                Shift A / Detroit Plant Alpha
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)] md:text-4xl">
              Plant overview with live machine risk, throughput, and intervention priorities.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-muted)] md:text-base">
              Monitor fleet stability, surface urgent anomalies, and route the next maintenance action without jumping between pages.
            </p>
            <p className="text-[var(--color-muted)] text-sm flex items-center gap-2 mt-4">
              <span className="relative flex h-2 w-2">
                {isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-[var(--color-success)]' : 'bg-slate-500'}`}></span>
              </span>
              {isLive ? 'Live Telemetry feed active' : 'Connecting to fleet...'}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[480px] xl:max-w-[560px]">
            {[
              { label: "Risk posture", value: isLoading ? "--" : `${stats.globalRisk ?? 0}%`, icon: Radar, tone: "text-[var(--color-warning)]" },
              { label: "Fleet health", value: isLoading ? "--" : `${stats.avgHealth}%`, icon: ShieldCheck, tone: "text-[var(--color-primary)]" },
              { label: "Open incidents", value: isLoading ? "--" : `${stats.activeAlerts}`, icon: AlertTriangle, tone: "text-[var(--color-destructive)]" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/8 bg-black/15 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">{item.label}</span>
                  <item.icon className={cn("h-4 w-4", item.tone)} />
                </div>
                <div className={cn("text-3xl font-bold tracking-tight", item.tone)}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: "Total Machines", value: isLoading ? "-" : machines.length, icon: Settings2, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "Active Alerts", value: isLoading ? "-" : stats.activeAlerts, icon: AlertTriangle, color: "text-[var(--color-warning)]", bg: "bg-amber-500/10 border-amber-500/20" },
          { label: "Factory Status", value: isLoading ? "-" : stats.factoryStatus, icon: Calendar, color: "text-[var(--color-info)]", bg: "bg-blue-400/10 border-blue-400/20" },
          { label: "Avg Health Score", value: isLoading ? "-" : `${stats.avgHealth}%`, icon: Activity, color: "text-[var(--color-destructive)]", bg: "bg-red-500/10 border-red-500/20" },
        ].map((kpi, i) => (
          <div key={i} className="surface-card rounded-2xl p-4 md:p-5 flex items-start sm:items-center justify-between flex-col-reverse sm:flex-row gap-3 sm:gap-0">
            <div className="flex flex-col w-full">
              <span className="text-[var(--color-muted)] text-[10px] md:text-xs uppercase font-bold tracking-[0.22em] truncate">{kpi.label}</span>
              <span className="text-2xl md:text-3xl font-bold font-mono mt-2 text-[var(--color-foreground)]">{kpi.value}</span>
            </div>
            <div className={`p-2.5 sm:p-3 rounded-2xl border ${kpi.bg} ${kpi.color} self-end sm:self-auto shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]`}>
              <kpi.icon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col xl:flex-row-reverse gap-6">
        <div className="w-full xl:w-[380px] 2xl:w-[420px] flex-shrink-0 flex flex-col min-w-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-muted)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
              Orchestrator Insights
            </h2>
            <Link href="/dashboard/alerts" className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)] hover:border-[var(--color-primary)]/25">View All</Link>
          </div>
          
          <div className="flex flex-row xl:flex-col gap-4 overflow-x-auto xl:overflow-x-visible pb-4 xl:pb-0 snap-x custom-scrollbar -mx-4 px-4 xl:mx-0 xl:px-0">
            {recommendations.length > 0 ? recommendations.map((rec) => (
              <div key={rec.id} className={cn(
                "surface-card w-[85vw] sm:w-[320px] xl:w-full flex-shrink-0 snap-center rounded-2xl p-5 border-l-[3px] min-h-[176px] flex flex-col transition-all hover:-translate-y-0.5 hover:border-[var(--color-primary)]/30",
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
                  className="mt-4 text-xs font-semibold bg-[var(--color-primary)] text-black px-4 py-2.5 rounded-xl hover:brightness-110 transition-all self-start shadow-[0_10px_30px_-18px_rgba(0,212,170,0.85)] flex items-center gap-2"
                >
                  Investigate Asset <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )) : (
              <div className="w-[85vw] sm:w-[320px] xl:w-full flex-shrink-0 snap-center bg-[var(--color-surface)]/50 border border-dashed border-[var(--color-border)] rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <Sparkles className="w-8 h-8 text-[var(--color-muted)] mb-3 opacity-20" />
                <p className="text-xs text-[var(--color-muted)]">No critical prescriptions generated. System baseline is nominal.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-6">
          <MachineUsageChart />
          
          <div>
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-muted)]">Machine Fleet</h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">Cards prioritize status, risk score, and maintenance load for faster scanning.</p>
              </div>
              <Link href="/dashboard/machines" className="hidden md:inline-flex rounded-full border border-white/8 bg-white/4 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-foreground)] hover:border-[var(--color-primary)]/25">
                Open fleet
              </Link>
            </div>
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
      
    </div>
  );
}
