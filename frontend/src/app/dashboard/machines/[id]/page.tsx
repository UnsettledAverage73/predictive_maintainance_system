"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import dynamic from 'next/dynamic';
import { ChevronRight, MessageSquare, Plus, FileDown, Settings2 } from "lucide-react";
import { ProtocolBadge } from "@/components/machines/ProtocolBadge";
import { StatusDot } from "@/components/ui/StatusDot";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { AgentPanel } from "@/components/agents/AgentPanel";
import { MaintenanceTable } from "@/components/machines/MaintenanceTable";
import { Machine, TelemetryPoint, MaintenanceTask } from "@/types";
import { api } from "@/lib/api";

// Dynamic import for heavy chart component
const TelemetryChart = dynamic(
  () => import("@/components/charts/TelemetryChart").then(mod => mod.TelemetryChart),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-[300px] w-full bg-[#1C2128]/50 animate-pulse rounded-xl border border-[var(--color-border)] flex items-center justify-center">
        <span className="text-slate-500 font-mono text-xs">Loading telemetry...</span>
      </div>
    ) 
  }
);

export default function MachineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const idStr = resolvedParams.id;
  
  const [machine, setMachine] = useState<Machine | null>(null);
  const [parameters, setParameters] = useState<any[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);
  const [logs, setLogs] = useState<MaintenanceTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chatInput, setChatInput] = useState("");
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
        
        setMachine(equipment);
        setParameters(paramData || []);
        setTelemetry(telemetryData);
        // Map backend logs to frontend MaintenanceTask type
        setLogs(historyData.map((l: any) => ({
          id: l.id.toString(),
          machineId: l.equipment_id,
          machineName: equipment?.name || l.equipment_id,
          title: l.action_taken,
          description: l.parts_replaced,
          aiReason: "Historical human intervention",
          priority: "medium",
          status: "completed",
          dueDate: l.timestamp,
          assignedTo: l.operator_name,
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
    const interval = setInterval(fetchData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [idStr]);

  const handleMitigate = async () => {
    // Optimistic UI update
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
      // In a real app, you might want to show a small toast instead of a blocking alert
      console.log("Mitigation command dispatched: Throttling load.");
    } catch (error) {
      console.error("Mitigation failed:", error);
      // Rollback on error
      setMachine(previousMachine);
    } finally {
      setIsMitigating(false);
    }
  };

  if (isLoading || !machine) {
    return <div className="p-12 text-center font-mono text-[var(--color-muted)]">Initializing Neural Link to {idStr}...</div>;
  }

  return (
    <div className="flex flex-col gap-6 pb-12 animate-in fade-in duration-500">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-muted)]">
        <Link href="/dashboard" className="hover:text-[var(--color-primary)] transition-colors">Plant</Link>
        <ChevronRight className="w-3 h-3" />
        <span>{machine.productionLine}</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-[var(--color-foreground)]">{machine.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <StatusDot status={machine.status} />
            <h1 className="text-3xl font-bold tracking-wide">{machine.name}</h1>
            <ProtocolBadge protocol={machine.protocol as any} />
          </div>
          <p className="text-sm font-mono text-[var(--color-muted)]">ID: {idStr}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/machines/${idStr}/parameters`}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-border)]/50 transition-all flex items-center gap-2"
          >
            <Settings2 className="w-4 h-4" /> Manage Parameters
          </Link>
          <button 
            onClick={handleMitigate}
            disabled={isMitigating}
            className="bg-[var(--color-destructive)]/10 border border-[var(--color-destructive)]/30 px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/20 transition-all flex items-center gap-2"
          >
            {isMitigating ? "Throttling..." : "Emergency Throttle"}
          </button>
          <button className="bg-[var(--color-primary)] text-[#0D1117] px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#00e6b8] transition-colors flex items-center gap-2 shadow-[0_0_10px_var(--color-primary)]/30">
            <Plus className="w-4 h-4" /> Work Order
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center text-center">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-muted)] mb-2">Risk Score</span>
          <RiskBadge score={machine.riskScore} className="text-2xl px-4 py-1" />
        </div>
        <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center text-center">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-muted)] mb-1">MTBF</span>
          <span className="text-2xl font-bold font-mono text-[var(--color-foreground)]">{machine.mtbf} <span className="text-sm text-[var(--color-muted)]">hrs</span></span>
        </div>
        <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center text-center">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-muted)] mb-1">Health Score</span>
          <span className="text-2xl font-bold font-mono text-[var(--color-primary)]">
            {(machine as any).healthScore}%
          </span>
        </div>
        <div className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center text-center">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-muted)] mb-1">Open Work Orders</span>
          <span className="text-2xl font-bold font-mono text-[var(--color-warning)]">{machine.openWorkOrders}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Dynamic Parameter Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {parameters.filter(p => p.is_visible).map(param => (
              <ParameterCard key={param.id} parameter={param} />
            ))}
          </div>

          <div className="glass-panel rounded-xl flex flex-col">
            <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center">
              <h3 className="font-semibold text-sm uppercase tracking-widest text-[var(--color-muted)]">Telemetry Live (Last 24h)</h3>
            </div>
            {telemetry.length > 0 ? (
              <TelemetryChart data={telemetry} machineId={idStr} className="border-0 bg-transparent shadow-none" />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-[var(--color-muted)] text-sm">No telemetry data available for this machine.</div>
            )}
          </div>
          
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-sm uppercase tracking-widest text-[var(--color-muted)] pl-1">Maintenance History</h3>
            <MaintenanceTable logs={logs} />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <AgentPanel 
            analysis={`The ${machine.name} is currently ${(machine as any).failureRisk} risk. ${(machine as any).minutesToFailure ? `Estimated time to critical threshold: ${(machine as any).minutesToFailure} minutes.` : 'Operating within stable parameters.'} Predictive analysis based on linear regression of last 20 temperature readings.`}
            confidence={92}
          />
          
          {/* Ask AI Context Box */}
          <div className="glass-panel p-4 rounded-xl mt-auto border-[var(--color-primary)]/30 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/10 rounded-full blur-[40px] -mr-16 -mt-16 pointer-events-none" />
            <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[var(--color-primary)]" />
              Ask Machine Agent
            </h4>
            <div className="relative">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="What caused the last failure?" 
                className="w-full bg-[var(--color-surface)]/50 border border-[var(--color-border)] rounded-lg pl-3 pr-10 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-all font-mono"
              />
              <Link href={`/dashboard/query?machineId=${idStr}&q=${encodeURIComponent(chatInput)}`} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-primary)] hover:scale-110 transition-transform">
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ParameterCard({ parameter }: { parameter: any }) {
  // Use a base value for simulation if no telemetry exists
  const baseValue = (parameter.normal_min + (parameter.normal_max - parameter.normal_min) * 0.5);
  const value = parameter.last_value !== undefined ? parameter.last_value : baseValue.toFixed(1);
  
  let statusColor = "bg-[var(--color-success)]";
  const numValue = parseFloat(value);
  
  if (parameter.direction === 'above') {
    if (numValue >= parameter.critical_threshold) statusColor = "bg-[var(--color-destructive)] shadow-[0_0_8px_var(--color-destructive)]";
    else if (numValue >= parameter.warning_threshold) statusColor = "bg-[var(--color-warning)] shadow-[0_0_8px_var(--color-warning)]";
  } else {
    if (numValue <= parameter.critical_threshold) statusColor = "bg-[var(--color-destructive)] shadow-[0_0_8px_var(--color-destructive)]";
    else if (numValue <= parameter.warning_threshold) statusColor = "bg-[var(--color-warning)] shadow-[0_0_8px_var(--color-warning)]";
  }

  return (
    <div className="glass-panel p-3 rounded-xl border-l-4 border-l-[var(--color-border)] hover:border-l-[var(--color-primary)] transition-all group cursor-help">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-muted)] group-hover:text-[var(--color-primary)] transition-colors truncate pr-1">
          {parameter.display_name}
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
