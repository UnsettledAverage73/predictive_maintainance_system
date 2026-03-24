'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from 'next/dynamic';
import { 
  Activity, ArrowLeft, Download, Loader2, ShieldCheck, 
  Radar, AlertTriangle, Factory, LayoutGrid, CheckCircle2
} from "lucide-react";
import { api } from "@/lib/api";
import { Machine, Alert } from "@/types";
import { cn } from "@/lib/utils";
import { generatePDF } from "@/lib/reports";
import { ProtocolBadge } from "@/components/machines/ProtocolBadge";
import { RiskBadge } from "@/components/ui/RiskBadge";

const MachineUsageChart = dynamic(() => import('@/components/charts/MachineUsageChart').then(mod => mod.MachineUsageChart), { 
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-[#1C2128]/50 animate-pulse rounded-xl" />
});

type FactoryStats = {
  globalRisk?: number;
  activeAlerts: number;
  avgHealth: number;
  factoryStatus: string;
};

export default function FacilityReportPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [stats, setStats] = useState<FactoryStats>({ globalRisk: 0, activeAlerts: 0, avgHealth: 100, factoryStatus: 'Optimal' });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [equipmentData, factoryStats, alertsData] = await Promise.all([
          api.getEquipment().catch(() => []) as Promise<Machine[]>,
          api.getFactoryStats().catch(() => ({ globalRisk: 0, activeAlerts: 0, avgHealth: 100, factoryStatus: 'Unknown' })) as Promise<FactoryStats>,
          api.getAlerts().catch(() => []) as Promise<any[]>
        ]);
        setMachines(Array.isArray(equipmentData) ? equipmentData : []);
        setStats(factoryStats);
        const safeAlerts = Array.isArray(alertsData) ? alertsData : [];
        setAlerts(safeAlerts.slice(0, 5).map(a => ({
          id: a.id.toString(),
          machineId: a.equipment_id,
          machineName: a.equipment_id,
          severity: a.severity.toLowerCase(),
          title: a.reason,
          description: "Tactical anomaly detected.",
          aiAnalysis: a.prescription,
          status: "new",
          createdAt: a.timestamp
        })));
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to fetch facility report data:", error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    await generatePDF('facility-report-content', `Facility_Operations_Report_${new Date().toISOString().split('T')[0]}`);
    setIsGenerating(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--color-primary)]" />
          <p className="font-mono text-sm text-[var(--color-muted)] italic">Aggregating Global Fleet Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20 max-w-6xl mx-auto">
      {/* Top Actions - Hidden in PDF */}
      <div className="flex items-center justify-between no-print">
        <Link 
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
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
      <div id="facility-report-content" className="flex flex-col gap-8 bg-[#030712] p-8 rounded-3xl border border-white/5">
        
        {/* Report Header */}
        <div className="flex flex-col md:flex-row justify-between gap-6 border-b border-white/10 pb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Factory className="w-6 h-6 text-[var(--color-primary)]" />
              <h1 className="text-4xl font-black tracking-tight uppercase">Facility Operations Report</h1>
            </div>
            <p className="text-[var(--color-muted)] font-mono text-sm uppercase tracking-[0.2em]">Plant Alpha • {new Date().toLocaleString()}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold uppercase tracking-widest text-[var(--color-primary)]">{stats.factoryStatus} Status</h2>
            <p className="text-sm text-[var(--color-muted)] mt-1">Global Operations Baseline</p>
          </div>
        </div>

        {/* Global KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col items-center text-center">
            <Radar className="w-5 h-5 text-[var(--color-warning)] mb-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] mb-1">Global Risk</span>
            <span className="text-2xl font-black text-[var(--color-warning)]">{stats.globalRisk}%</span>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col items-center text-center">
            <ShieldCheck className="w-5 h-5 text-[var(--color-primary)] mb-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] mb-1">Fleet Health</span>
            <span className="text-2xl font-black text-[var(--color-primary)]">{stats.avgHealth}%</span>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col items-center text-center">
            <AlertTriangle className="w-5 h-5 text-[var(--color-destructive)] mb-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] mb-1">Active Incidents</span>
            <span className="text-2xl font-black text-[var(--color-destructive)]">{stats.activeAlerts}</span>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col items-center text-center">
            <CheckCircle2 className="w-5 h-5 text-blue-400 mb-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] mb-1">Total Assets</span>
            <span className="text-2xl font-black text-white">{machines.length}</span>
          </div>
        </div>

        {/* Usage Trend Chart */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-[var(--color-primary)]" />
            <h3 className="text-lg font-bold uppercase tracking-widest">Facility Utilization Trend</h3>
          </div>
          <div className="bg-black/20 rounded-2xl border border-white/5 p-6 h-[350px]">
            <MachineUsageChart />
          </div>
        </div>

        {/* Top Critical Alerts */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-[var(--color-destructive)]" />
            <h3 className="text-lg font-bold uppercase tracking-widest">Urgent Operational Alerts</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.map((alert) => (
              <div key={alert.id} className={cn(
                "glass-panel p-4 rounded-xl border-l-[3px]",
                alert.severity === 'critical' ? "border-l-[var(--color-destructive)]" : "border-l-[var(--color-warning)]"
              )}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-white uppercase">{alert.machineId}</span>
                  <span className="text-[9px] text-[var(--color-muted)] font-mono">{new Date(alert.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-xs font-semibold text-white line-clamp-2">{alert.aiAnalysis}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Full Machine Fleet Table */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <LayoutGrid className="w-5 h-5 text-[var(--color-primary)]" />
            <h3 className="text-lg font-bold uppercase tracking-widest">Asset Fleet Inventory</h3>
          </div>
          <div className="overflow-x-auto glass-panel rounded-2xl border border-white/5">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white/5 text-[var(--color-muted)] uppercase text-[10px] font-bold tracking-widest border-b border-white/10">
                <tr>
                  <th className="p-4">Asset Name</th>
                  <th className="p-4">Line</th>
                  <th className="p-4">Protocol</th>
                  <th className="p-4">Risk</th>
                  <th className="p-4">Health</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {machines.map((machine) => (
                  <tr key={machine.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{machine.name}</span>
                        <span className="text-[10px] font-mono text-[var(--color-muted)]">{machine.id}</span>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-medium text-[var(--color-muted)]">{machine.productionLine}</td>
                    <td className="p-4"><ProtocolBadge protocol={machine.protocol} /></td>
                    <td className="p-4"><RiskBadge score={machine.riskScore} /></td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-white/5 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-[var(--color-primary)] h-full" 
                            style={{ width: `${machine.healthScore ?? (100 - machine.riskScore)}%` }} 
                          />
                        </div>
                        <span className="text-xs font-bold text-[var(--color-primary)]">
                          {machine.healthScore ?? (100 - machine.riskScore)}%
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                       <span className={cn(
                         "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                         machine.status === 'online' ? "bg-[var(--color-success)]/10 text-[var(--color-success)]" :
                         machine.status === 'warning' ? "bg-[var(--color-warning)]/10 text-[var(--color-warning)]" :
                         machine.status === 'critical' ? "bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]" :
                         "bg-white/10 text-white"
                       )}>
                         {machine.status}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Report Footer */}
        <div className="mt-8 pt-8 border-t border-white/5 flex justify-between items-center text-[var(--color-muted)]">
          <p className="text-[10px] font-bold uppercase tracking-widest">Automated System Aggregate</p>
          <p className="text-[10px] font-mono italic">Page 1 of 1</p>
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
          width: 1100px !important;
        }
      `}</style>
    </div>
  );
}
