"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import dynamic from 'next/dynamic';
import { 
  ChevronRight, MessageSquare, Plus, FileDown, 
  Settings2, Upload, Activity, Zap, Loader2 
} from "lucide-react";
import { ProtocolBadge } from "@/components/machines/ProtocolBadge";
import { StatusDot } from "@/components/ui/StatusDot";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { AgentPanel } from "@/components/agents/AgentPanel";
import { MaintenanceTable } from "@/components/machines/MaintenanceTable";
import { api } from "@/lib/api";
import { Machine, TelemetryPoint, MaintenanceTask } from "@/types";
import { cn } from "@/lib/utils";

const TelemetryChart = dynamic(() => import('@/components/charts/TelemetryChart').then(mod => mod.TelemetryChart), { 
  ssr: false,
  loading: () => <div className="h-[350px] w-full bg-[#1C2128]/50 animate-pulse rounded-xl" />
});

export default function MachineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const idStr = resolvedParams.id;

  const [machine, setMachine] = useState<Machine | null>(null);
  const [parameters, setParameters] = useState<any[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);
  const [logs, setLogs] = useState<MaintenanceTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMitigating, setIsMitigating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [equipment, telemetryData, historyData, paramData] = await Promise.all([
          api.getEquipment().then(list => list.find((m: Machine) => m.id === idStr)),
          api.getMachineTelemetry(idStr),
          api.getMachineHistory(idStr),
          api.getMachineParameters(idStr)
        ]);
        
        if (equipment) setMachine(equipment);
        setParameters(paramData || []);
        setTelemetry(telemetryData);
        setLogs(historyData.map((l: any) => ({
          id: l.id.toString(),
          machineId: l.equipment_id,
          machineName: equipment?.name || idStr,
          title: l.action_taken,
          status: "completed",
          priority: "medium",
          dueDate: l.timestamp,
          assignedTo: l.operator_name,
          aiReason: "Manual maintenance log entry.",
          description: l.parts_replaced !== "None" ? `Replaced: ${l.parts_replaced}` : "General service.",
          estimatedHours: 0,
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

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight">{machine.name}</h1>
            <ProtocolBadge protocol={machine.protocol} />
            <StatusDot status={machine.status} size="lg" />
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
          
          {/* Dynamic Parameter Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {parameters.filter(p => p.isVisible).map(param => (
              <ParameterCard key={param.id} parameter={param} />
            ))}
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
                  <span className="font-bold text-[var(--color-primary)]">{machine.healthScore}%</span>
                </div>
                <div className="w-full bg-[var(--color-border)] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[var(--color-primary)] h-full transition-all duration-1000" style={{ width: `${machine.healthScore}%` }} />
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
              <span className="text-xl font-bold font-mono">{machine.minutesToFailure}m</span>
            </div>
          </div>

          {/* Machine AI Agent */}
          <AgentPanel analysis="Orchestrator monitoring active. Analyzing telemetry streams for cross-parameter anomalies..." confidence={94.2} />
        </div>
      </div>
    </div>
  );
}

function ParameterCard({ parameter }: { parameter: any }) {
  const baseValue = (parameter.normalMin + (parameter.normalMax - parameter.normalMin) * 0.5);
  const value = parameter.lastValue !== undefined ? parameter.lastValue : baseValue.toFixed(1);
  
  let statusColor = "bg-[var(--color-success)]";
  const numValue = parseFloat(value);
  
  if (parameter.direction === 'above') {
    if (numValue >= parameter.criticalThreshold) statusColor = "bg-[var(--color-destructive)] shadow-[0_0_8px_var(--color-destructive)]";
    else if (numValue >= parameter.warningThreshold) statusColor = "bg-[var(--color-warning)] shadow-[0_0_8px_var(--color-warning)]";
  } else {
    if (numValue <= parameter.criticalThreshold) statusColor = "bg-[var(--color-destructive)] shadow-[0_0_8px_var(--color-destructive)]";
    else if (numValue <= parameter.warningThreshold) statusColor = "bg-[var(--color-warning)] shadow-[0_0_8px_var(--color-warning)]";
  }

  return (
    <div className="glass-panel p-3 rounded-xl border-l-4 border-l-[var(--color-border)] hover:border-l-[var(--color-primary)] transition-all group cursor-help">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-muted)] group-hover:text-[var(--color-primary)] transition-colors truncate pr-1">
          {parameter.displayName}
        </span>
        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusColor)} />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold font-mono tracking-tight">{value}</span>
        <span className="text-[10px] font-medium text-[var(--color-muted)] uppercase">{parameter.unit}</span>
      </div>
    </div>
  );
}
