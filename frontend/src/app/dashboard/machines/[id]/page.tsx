"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import dynamic from 'next/dynamic';
import { 
  Settings2, Upload, Activity, Zap, Loader2, AlertTriangle, FileText
} from "lucide-react";
import { ProtocolBadge } from "@/components/machines/ProtocolBadge";
import { StatusDot } from "@/components/ui/StatusDot";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { MachineAgentChat } from "@/components/agents/MachineAgentChat";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { MaintenanceTable } from "@/components/machines/MaintenanceTable";
import { MachineInsightsGrid } from "@/components/machines/MachineInsightsGrid";
import { api, buildWebSocketUrl } from "@/lib/api";
import { Machine, TelemetryPoint, MaintenanceTask, MachineInsights } from "@/types";
import { cn } from "@/lib/utils";

interface ParameterView {
  id: number | string;
  displayName: string;
  parameterKey: string;
  parameter_key?: string;
  display_name?: string;
  unit?: string;
  normalMin?: number;
  normal_min?: number;
  normalMax?: number;
  normal_max?: number;
  warningThreshold?: number;
  warning_threshold?: number;
  criticalThreshold?: number;
  critical_threshold?: number;
  direction?: 'above' | 'below';
  lastValue?: number | string;
  isVisible?: boolean;
  is_visible?: boolean;
}

interface ManualHistoryRow {
  id: number;
  equipment_id: string;
  timestamp: string;
  operator_name?: string;
  action_taken: string;
  parts_replaced?: string;
}

interface TelemetrySnapshot extends TelemetryPoint {
  humidity?: number;
  status?: string;
  time?: string;
}

const TelemetryChart = dynamic(() => import('@/components/charts/TelemetryChart').then(mod => mod.TelemetryChart), { 
  ssr: false,
  loading: () => <div className="h-[350px] w-full bg-[#1C2128]/50 animate-pulse rounded-xl" />
});

export default function MachineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const idStr = resolvedParams.id;

  const [machine, setMachine] = useState<Machine | null>(null);
  const [parameters, setParameters] = useState<ParameterView[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);
  const [logs, setLogs] = useState<MaintenanceTask[]>([]);
  const [insights, setInsights] = useState<MachineInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMitigating, setIsMitigating] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [equipment, telemetryData, historyData, paramData, insightData] = await Promise.all([
          api.getEquipment().then(list => list.find((m: Machine) => m.id === idStr)).catch(() => null),
          api.getMachineTelemetry(idStr).catch(() => []),
          api.getMachineHistory(idStr).catch(() => []),
          api.getMachineParameters(idStr).catch(() => []),
          api.getMachineInsights(idStr).catch(() => null)
        ]);
        
        if (equipment) setMachine(equipment);
        setParameters((paramData || []).map((p: any) => ({
          ...p,
          parameterKey: p.parameterKey || p.parameter_key || p.name || String(p.id)
        })));
        setTelemetry(telemetryData || []);
        setInsights(insightData);
        const safeHistory = Array.isArray(historyData) ? historyData : [];
        setLogs(safeHistory.map((l: ManualHistoryRow) => ({
          id: l.id.toString(),
          machine_id: l.equipment_id,
          machine_name: equipment?.name || idStr,
          task_name: l.action_taken,
          task_type: 'routine' as const,
          status: "completed" as const,
          priority: "medium" as const,
          due_date: l.timestamp,
          assigned_to: l.operator_name || "Unassigned",
          aiReason: "Manual maintenance log entry.",
          notes: l.parts_replaced !== "None" ? `Replaced: ${l.parts_replaced}` : "General service.",
          created_at: l.timestamp,
          machineId: l.equipment_id,
          machineName: equipment?.name || idStr,
          title: l.action_taken,
          dueDate: l.timestamp,
          assignedTo: l.operator_name || "Unassigned",
          createdAt: l.timestamp
        })));
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to fetch machine details:", error);
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [idStr]);

  // Real-Time Telemetry WebSocket Stream
  useEffect(() => {
    if (!idStr) return;
    const wsUrl = buildWebSocketUrl(`/ws/telemetry/${idStr}`);
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const point = JSON.parse(event.data);
          if (point) {
            setTelemetry((prev) => {
              const next = [...prev, {
                timestamp: point.time || point.timestamp || new Date().toISOString(),
                ...point
              }];
              return next.slice(-100);
            });
          }
        } catch {}
      };
    } catch (e) {
      console.warn("Telemetry WS connection error:", e);
    }
    return () => {
      if (ws) ws.close();
    };
  }, [idStr]);

  const handleMitigate = async () => {
    const previousMachine = machine;
    if (machine) {
      setMachine({
        ...machine,
        status: 'online',
        riskScore: Math.max(0, machine.riskScore - 30)
      });
    }

    setIsMitigating(true);
    try {
      await api.mitigateRisk(idStr);
      console.log("Mitigation command dispatched: Throttling load.");
    } catch (error) {
      console.error("Mitigation failed:", error);
      setMachine(previousMachine);
    } finally {
      setIsMitigating(false);
    }
  };

  const handleTriggerAnomaly = async () => {
    setIsTriggering(true);
    try {
      await api.triggerAnomaly(idStr);
      console.log("Anomaly trigger dispatched: Critical temperature spike.");
    } catch (error) {
      console.error("Anomaly trigger failed:", error);
    } finally {
      setIsTriggering(false);
    }
  };

  if (isLoading || !machine) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--color-primary)]" />
          <p className="font-mono text-sm text-[var(--color-muted)] italic">Synchronizing with Asset Ledger...</p>
        </div>
      </div>
    );
  }

  const healthScore = machine.healthScore ?? Math.max(0, 100 - machine.riskScore);
  const minutesToFailure = machine.minutesToFailure ?? null;
  const latestTelemetry = telemetry.length > 0 ? (telemetry[telemetry.length - 1] as TelemetrySnapshot) : null;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight">{machine.name}</h1>
            <ProtocolBadge protocol={machine.protocol} />
            <StatusDot status={machine.status} className="scale-125" />
          </div>
          <p className="text-sm font-mono text-[var(--color-muted)] flex items-center gap-2">
            <span className="bg-[var(--color-surface)] px-2 py-0.5 rounded border border-[var(--color-border)]">ID: {idStr}</span>
            <span className="text-[var(--color-primary)] opacity-50">/</span>
            <span>{machine.productionLine}</span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href={`/dashboard/machines/${idStr}/import/csv`}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-border)]/50 transition-all flex items-center gap-2"
          >
            <Upload className="w-4 h-4" /> CSV Ingest
          </Link>
          <Link
            href={`/dashboard/machines/${idStr}/parameters`}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-border)]/50 transition-all flex items-center gap-2"
          >
            <Settings2 className="w-4 h-4" /> Manage Registry
          </Link>
          <Link
            href={`/dashboard/reports/machine/${idStr}`}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-border)]/50 transition-all flex items-center gap-2 text-[var(--color-primary)]"
          >
            <FileText className="w-4 h-4" /> Detailed Report
          </Link>
          <button 
            onClick={handleTriggerAnomaly}
            disabled={isTriggering}
            className="bg-amber-500/10 border border-amber-500/50 text-amber-500 px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-500/20 transition-all flex items-center gap-2"
          >
            {isTriggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
            Trigger Test Alert
          </button>
          <button 
            onClick={handleMitigate}
            disabled={isMitigating}
            className="bg-[var(--color-destructive)] text-white px-4 py-2 rounded-lg text-sm font-bold hover:brightness-110 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
          >
            <Zap className="w-4 h-4" /> Emergency Throttle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Telemetry & Parameters */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          
          {/* Dynamic Parameter Grid with Real Live Sensor Signal */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {parameters.filter((p) => p.isVisible ?? p.is_visible).map((param) => {
              const liveVal = latestTelemetry ? (latestTelemetry as any)[param.parameterKey] : undefined;
              return <ParameterCard key={param.id} parameter={param} liveValue={liveVal} />;
            })}
          </div>

          {/* Quick Hardware Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="glass-panel p-4 rounded-xl border border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] block mb-1">Motor Temp (DHT11)</span>
              <span className="text-2xl font-black font-mono text-white">
                {typeof latestTelemetry?.temperature === "number" && latestTelemetry.temperature > 0
                  ? `${latestTelemetry.temperature.toFixed(1)}°C`
                  : "--"}
              </span>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] block mb-1">Current Draw (ACS712)</span>
              <span className="text-2xl font-black font-mono text-amber-300">
                {typeof (latestTelemetry as any)?.current_draw === "number"
                  ? `${(latestTelemetry as any).current_draw.toFixed(2)} A`
                  : "--"}
              </span>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] block mb-1">Shaft Speed (Hall RPM)</span>
              <span className="text-2xl font-black font-mono text-[var(--color-primary)]">
                {typeof (latestTelemetry as any)?.rpm === "number"
                  ? `${Math.round((latestTelemetry as any).rpm)} RPM`
                  : "--"}
              </span>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-white/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Live Stream</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <span className="text-sm font-mono text-white block truncate">
                {latestTelemetry?.time || latestTelemetry?.timestamp
                  ? new Date(latestTelemetry.time || latestTelemetry.timestamp || "").toLocaleTimeString()
                  : "Awaiting Packets"}
              </span>
            </div>
          </div>

          {/* Main Chart */}
          <div className="glass-panel rounded-xl flex flex-col">
            <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center">
              <h3 className="font-semibold text-xs uppercase tracking-widest text-[var(--color-muted)] flex items-center gap-2">
                <Activity className="w-3 h-3 text-[var(--color-primary)]" />
                Live Telemetry Matrix
              </h3>
            </div>
            <div className="p-2">
              {telemetry.length > 0 ? (
                <TelemetryChart data={telemetry} machineId={idStr} parameters={parameters} className="border-0 bg-transparent shadow-none" />
              ) : (
                <div className="h-[350px] flex flex-col items-center justify-center text-[var(--color-muted)] text-sm gap-4">
                  <Loader2 className="w-8 h-8 animate-spin opacity-20" />
                  <span>Establishing neural link to asset sensors...</span>
                </div>
              )}
            </div>
          </div>

          {insights ? (
            <MachineInsightsGrid insights={insights} />
          ) : (
            <div className="glass-panel rounded-2xl p-5 border border-white/10 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Machine intelligence is not available yet.</p>
                <p className="text-sm text-[var(--color-muted)] mt-1">Cost, threat, incident, and wear insights will appear here once the backend payload is available.</p>
              </div>
            </div>
          )}

          <div className="glass-panel rounded-xl">
            <div className="p-4 border-b border-[var(--color-border)]">
              <h3 className="font-semibold text-xs uppercase tracking-widest text-[var(--color-muted)]">Historical Interventions</h3>
            </div>
            <MaintenanceTable logs={logs} />
          </div>
        </div>

        {/* Right Column: Asset Metadata & AI Agent */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Asset Identity Card */}
          <div className="glass-panel p-5 rounded-xl border-t-4 border-t-[var(--color-primary)] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">Asset Identity</h3>
            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-[var(--color-muted)] uppercase font-bold block">Production Line</span>
                <span className="text-sm font-medium">{machine.productionLine}</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--color-muted)] uppercase font-bold block">Protocol Handshake</span>
                <div className="flex items-center gap-2 mt-1">
                  <ProtocolBadge protocol={machine.protocol} />
                  <span className="text-xs font-mono opacity-60">Handshake OK</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] text-[var(--color-muted)] uppercase font-bold block">Service Cycle (MTBF)</span>
                <span className="text-sm font-mono">{machine.mtbf} Hours</span>
              </div>
              <div className="pt-2 border-t border-[var(--color-border)]">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--color-muted)]">Health Index</span>
                  <span className="font-bold text-[var(--color-primary)]">{healthScore}%</span>
                </div>
                <div className="w-full bg-[var(--color-border)] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[var(--color-primary)] h-full transition-all duration-1000" style={{ width: `${healthScore}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Risk Profile */}
          <div className="glass-panel p-5 rounded-xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">Risk Profile</h3>
            <div className="flex items-center justify-between">
              <span className="text-xs">Failure Probability</span>
              <RiskBadge score={machine.riskScore} />
            </div>
            <div className="p-3 bg-[var(--color-destructive)]/5 border border-[var(--color-destructive)]/20 rounded-lg">
              <span className="text-[10px] text-[var(--color-destructive)] font-bold uppercase block mb-1">Est. Time to Failure</span>
              <span className="text-xl font-bold font-mono">{minutesToFailure !== null ? `${minutesToFailure}m` : 'Stable'}</span>
            </div>
          </div>

          {/* Machine AI Agent */}
          <ErrorBoundary title="Agent Logic Failure">
            <MachineAgentChat machineId={idStr} machineName={machine.name} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

function ParameterCard({ parameter, liveValue }: { parameter: ParameterView; liveValue?: any }) {
  const normalMin = parameter.normalMin ?? parameter.normal_min ?? 0;
  const normalMax = parameter.normalMax ?? parameter.normal_max ?? 0;
  const warningThreshold = parameter.warningThreshold ?? parameter.warning_threshold ?? 0;
  const criticalThreshold = parameter.criticalThreshold ?? parameter.critical_threshold ?? 0;
  const displayName = parameter.displayName || parameter.display_name || 'Parameter';
  
  const hasLiveSignal = liveValue !== undefined && liveValue !== null && !isNaN(Number(liveValue));
  const numValue = hasLiveSignal ? Number(liveValue) : null;
  const displayVal = hasLiveSignal 
    ? (Number.isInteger(numValue) ? String(numValue) : (numValue as number).toFixed(1))
    : "--";
  
  let statusColor = "bg-zinc-600";
  if (hasLiveSignal && numValue !== null) {
    statusColor = "bg-[var(--color-success)]";
    if (parameter.direction === 'above') {
      if (numValue >= criticalThreshold) statusColor = "bg-[var(--color-destructive)] shadow-[0_0_8px_var(--color-destructive)]";
      else if (numValue >= warningThreshold) statusColor = "bg-[var(--color-warning)] shadow-[0_0_8px_var(--color-warning)]";
    } else {
      if (numValue <= criticalThreshold) statusColor = "bg-[var(--color-destructive)] shadow-[0_0_8px_var(--color-destructive)]";
      else if (numValue <= warningThreshold) statusColor = "bg-[var(--color-warning)] shadow-[0_0_8px_var(--color-warning)]";
    }
  }

  return (
    <div className={cn(
      "glass-panel p-3 rounded-xl border-l-4 transition-all group",
      hasLiveSignal ? "border-l-[var(--color-primary)] hover:border-l-[var(--color-primary)]" : "border-l-zinc-700 opacity-75"
    )}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-muted)] group-hover:text-[var(--color-primary)] transition-colors truncate pr-1">
          {displayName}
        </span>
        <div className="flex items-center gap-1.5">
          {!hasLiveSignal && (
            <span className="text-[8px] font-mono px-1 rounded bg-zinc-800 text-zinc-500 border border-zinc-700">NO SENSOR</span>
          )}
          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusColor, hasLiveSignal && "animate-pulse")} />
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold font-mono tracking-tight">{displayVal}</span>
        {parameter.unit && <span className="text-[10px] font-medium text-[var(--color-muted)] uppercase">{parameter.unit}</span>}
      </div>
    </div>
  );
}
