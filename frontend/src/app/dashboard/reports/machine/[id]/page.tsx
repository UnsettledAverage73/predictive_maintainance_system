'use client';

import { use, useState, useEffect } from "react";
import Link from "next/link";
import dynamic from 'next/dynamic';
import { 
  Activity, ArrowLeft, Download, Loader2, ShieldAlert, 
  Calendar, Settings2, FileText
} from "lucide-react";
import { api } from "@/lib/api";
import { Machine, TelemetryPoint, MaintenanceTask, MachineInsights } from "@/types";
import { generatePDF } from "@/lib/reports";
import { ProtocolBadge } from "@/components/machines/ProtocolBadge";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { MaintenanceTable } from "@/components/machines/MaintenanceTable";

const TelemetryChart = dynamic(() => import('@/components/charts/TelemetryChart').then(mod => mod.TelemetryChart), { 
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-[#1C2128]/50 animate-pulse rounded-xl" />
});

interface ParameterView {
  id: number | string;
  displayName: string;
  parameterKey?: string;
  parameter_key?: string;
  unit?: string;
  lastValue?: number | string;
  isVisible?: boolean;
  is_visible?: boolean;
}

export default function MachineReportPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const idStr = resolvedParams.id;

  const [machine, setMachine] = useState<Machine | null>(null);
  const [parameters, setParameters] = useState<ParameterView[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);
  const [logs, setLogs] = useState<MaintenanceTask[]>([]);
  const [insights, setInsights] = useState<MachineInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [equipment, telemetryData, historyData, paramData, insightData] = await Promise.all([
          api.getEquipment().then(list => list.find((m: Machine) => m.id === idStr)).catch(() => null),
          api.getMachineTelemetry(idStr, 1440).catch(() => []),
          api.getMachineHistory(idStr).catch(() => []),
          api.getMachineParameters(idStr).catch(() => []),
          api.getMachineInsights(idStr).catch(() => null)
        ]);
        
        if (equipment) setMachine(equipment);
        setParameters(paramData || []);
        setTelemetry(telemetryData || []);
        setInsights(insightData);
        setLogs((Array.isArray(historyData) ? historyData : []).map((l) => ({
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
          createdAt: l.timestamp
        })));
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to fetch machine report data:", error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [idStr]);

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    await generatePDF('report-content', `Machine_Report_${idStr}_${new Date().toISOString().split('T')[0]}`);
    setIsGenerating(false);
  };

  if (isLoading || !machine) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--color-primary)]" />
          <p className="font-mono text-sm text-[var(--color-muted)] italic">Compiling Comprehensive Asset Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20 max-w-6xl mx-auto">
      {/* Top Actions - Hidden in PDF */}
      <div className="flex items-center justify-between no-print">
        <Link 
          href={`/dashboard/machines/${idStr}`}
          className="flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Asset
        </Link>
        <button
          onClick={handleDownloadPDF}
          disabled={isGenerating}
          className="bg-[var(--color-primary)] text-black px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,212,170,0.3)] disabled:opacity-50"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Download PDF Report
        </button>
      </div>

      {/* Report Content */}
      <div id="report-content" className="flex flex-col gap-8 bg-[#030712] p-8 rounded-3xl border border-white/5">
        
        {/* Report Header */}
        <div className="flex flex-col md:flex-row justify-between gap-6 border-b border-white/10 pb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-6 h-6 text-[var(--color-primary)]" />
              <h1 className="text-4xl font-black tracking-tight uppercase">Asset Intelligence Report</h1>
            </div>
            <p className="text-[var(--color-muted)] font-mono text-sm uppercase tracking-[0.2em]">Generated on {new Date().toLocaleString()}</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold">{machine.name}</h2>
            <div className="flex items-center justify-end gap-3 mt-1">
              <ProtocolBadge protocol={machine.protocol} />
              <span className="text-sm font-mono text-[var(--color-muted)]">ID: {idStr}</span>
            </div>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl border-t-4 border-t-[var(--color-primary)]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] block mb-1">Current Health Index</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-[var(--color-primary)]">{machine.healthScore ?? (100 - machine.riskScore)}%</span>
              <span className="text-xs text-[var(--color-muted)] font-medium">Operational</span>
            </div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border-t-4 border-t-[var(--color-warning)]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] block mb-1">Risk Posture</span>
            <div className="flex items-center justify-between">
              <span className="text-4xl font-black text-[var(--color-warning)]">{machine.riskScore}%</span>
              <RiskBadge score={machine.riskScore} />
            </div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border-t-4 border-t-[var(--color-info)]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] block mb-1">Failure Prediction</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{machine.minutesToFailure !== null ? `${machine.minutesToFailure}m` : 'Stable'}</span>
              <span className="text-xs text-[var(--color-muted)] font-medium">to potential incident</span>
            </div>
          </div>
        </div>

        {/* Telemetry Analysis */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-[var(--color-primary)]" />
            <h3 className="text-lg font-bold uppercase tracking-widest">24-Hour Telemetry Matrix</h3>
          </div>
          <div className="bg-black/20 rounded-2xl border border-white/5 p-4">
             <TelemetryChart 
               data={telemetry} 
               machineId={idStr} 
               parameters={parameters} 
               className="border-0 bg-transparent shadow-none p-0" 
             />
          </div>
        </div>

        {/* Machine Insights Section */}
        {insights && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bold uppercase tracking-widest flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[var(--color-destructive)]" />
                Threat Detection
              </h3>
              <div className="glass-panel p-5 rounded-2xl border border-[var(--color-destructive)]/20">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-white">{insights.threatDetection.threat}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]">
                    Confidence: {insights.threatDetection.confidence}%
                  </span>
                </div>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed">{insights.threatDetection.recommendedAction}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold uppercase tracking-widest flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-[var(--color-primary)]" />
                Component Wear Analysis
              </h3>
              <div className="glass-panel p-5 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-[var(--color-muted)]">Wear Index</span>
                  <span className="text-lg font-black text-[var(--color-primary)]">{insights.wearModel.wearIndex.toFixed(1)}/10.0</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2">
                  <div className="bg-[var(--color-primary)] h-full rounded-full" style={{ width: `${insights.wearModel.wearIndex * 10}%` }} />
                </div>
                <p className="text-xs text-[var(--color-muted)] mt-4 italic font-medium">{insights.wearModel.whatIfScenario}</p>
              </div>
            </div>
          </div>
        )}

        {/* Historical Interventions */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-[var(--color-info)]" />
            <h3 className="text-lg font-bold uppercase tracking-widest">Maintenance History & Log</h3>
          </div>
          <div className="no-shadow">
            <MaintenanceTable logs={logs} />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-8 border-t border-white/5 flex justify-between items-end text-[var(--color-muted)]">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest">Facility Operations Node</p>
            <p className="text-xs font-medium">Detroit Plant Alpha • Section {machine.productionLine}</p>
          </div>
          <p className="text-[10px] font-mono italic">End of Automated Intelligence Report</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
        }
        .printing-mode {
          border-radius: 0 !important;
          border: none !important;
          max-width: none !important;
          width: 1000px !important; /* Fixed width for consistent PDF aspect ratio */
        }
        .no-shadow .glass-panel {
          box-shadow: none !important;
          background: rgba(255, 255, 255, 0.02) !important;
        }
      `}</style>
    </div>
  );
}
