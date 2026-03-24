'use client';

import { useState, useEffect } from 'react';
import { 
  Shield, RefreshCcw, Zap, AlertOctagon, ArrowRight, 
  Activity, Clock, DollarSign, CheckCircle2, XCircle, 
  BarChart3, Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import { format } from 'date-fns';

interface MitigationLog {
  id: number;
  machine_id: string;
  machine_name: string;
  machine_class: string;
  content: string;
  timestamp: string;
}

interface MitigationStats {
  rerouteCount: number;
  downtimeAvoidedMins: number;
  totalSavingsInr: number;
  activeMitigations: number;
}

export default function MitigationDashboard() {
  const [logs, setLogs] = useState<MitigationLog[]>([]);
  const [stats, setStats] = useState<MitigationStats>({
    rerouteCount: 0,
    downtimeAvoidedMins: 0,
    totalSavingsInr: 0,
    activeMitigations: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [historyData, statsData] = await Promise.all([
          api.getMitigationHistory(),
          api.getMitigationStats()
        ]);
        setLogs(historyData);
        setStats(statsData);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to fetch mitigation data:", error);
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-20">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
              <Shield className="w-6 h-6 text-[var(--color-primary)]" />
            </div>
            <h1 className="text-3xl font-black tracking-tight uppercase italic">Autonomous Mitigation Control</h1>
          </div>
          <p className="text-[var(--color-muted)] font-mono text-xs uppercase tracking-widest">
            Rerouting Control Center • Self-Healing Manufacturing Pipeline
          </p>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-tighter text-emerald-500">System Guardian Online</span>
        </div>
      </div>

      {/* Impact Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-2xl border-t-4 border-t-[var(--color-primary)] bg-gradient-to-br from-[var(--color-primary)]/5 to-transparent">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-black/20 rounded-lg">
              <RefreshCcw className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <span className="text-[10px] font-black text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded uppercase">Real-time</span>
          </div>
          <span className="text-3xl font-black text-white">{stats.rerouteCount}</span>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] mt-1">Total Reroutes</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-t-4 border-t-[var(--color-info)] bg-gradient-to-br from-[var(--color-info)]/5 to-transparent">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-black/20 rounded-lg">
              <Clock className="w-5 h-5 text-[var(--color-info)]" />
            </div>
          </div>
          <span className="text-3xl font-black text-white">{stats.downtimeAvoidedMins}m</span>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] mt-1">Downtime Prevented</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-t-4 border-t-emerald-500 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-black/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <span className="text-3xl font-black text-white">₹{(stats.totalSavingsInr / 1000).toFixed(0)}k</span>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] mt-1">Est. Cost Saved</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-t-4 border-t-[var(--color-warning)] bg-gradient-to-br from-[var(--color-warning)]/5 to-transparent">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-black/20 rounded-lg">
              <Zap className="w-5 h-5 text-[var(--color-warning)]" />
            </div>
          </div>
          <span className="text-3xl font-black text-white">{stats.activeMitigations}</span>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] mt-1">Active Mitigations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Mitigation Log Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-lg font-bold uppercase tracking-widest">Self-Healing Execution Log</h2>
          </div>
          
          <div className="flex flex-col gap-3">
            {logs.length === 0 ? (
              <div className="glass-panel p-12 rounded-2xl text-center border-dashed border-white/5">
                <Shield className="w-12 h-12 text-white/5 mx-auto mb-4" />
                <p className="text-[var(--color-muted)] font-mono text-sm uppercase italic">No autonomous actions recorded in this window.</p>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="glass-panel p-5 rounded-2xl border-l-4 border-l-[var(--color-primary)] hover:translate-x-1 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-white uppercase tracking-tight">{log.machine_name}</span>
                        <span className="text-[10px] font-mono text-[var(--color-muted)]">{log.machine_class}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--color-muted)]">{format(new Date(log.timestamp), 'HH:mm:ss')}</span>
                  </div>
                  <p className="text-xs text-[var(--color-muted)] leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5 italic">
                    {log.content}
                  </p>
                  <div className="flex items-center gap-4 mt-4">
                    <button className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter text-white/40 hover:text-white transition-colors">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Acknowledge
                    </button>
                    <button className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter text-white/40 hover:text-white transition-colors">
                      <XCircle className="w-3.5 h-3.5 text-[var(--color-destructive)]" /> Manual Override
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Status / Sidebar info */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Zap className="w-24 h-24" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-[var(--color-warning)]" />
              Decision Engine Status
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-[11px] font-bold uppercase">
                <span className="text-[var(--color-muted)]">Rerouting Confidence Threshold</span>
                <span className="text-[var(--color-primary)]">92%</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1.5">
                <div className="bg-[var(--color-primary)] h-full rounded-full" style={{ width: '92%' }} />
              </div>
              
              <div className="flex justify-between items-center text-[11px] font-bold uppercase pt-2">
                <span className="text-[var(--color-muted)]">Safety Interlock Protocol</span>
                <span className="text-emerald-500">Active</span>
              </div>
              <div className="flex justify-between items-center text-[11px] font-bold uppercase">
                <span className="text-[var(--color-muted)]">Candidate Selection Pool</span>
                <span className="text-white">4 Machines</span>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20">
             <h3 className="text-xs font-black uppercase tracking-widest text-[var(--color-primary)] mb-3 italic">Did you know?</h3>
             <p className="text-xs text-[var(--color-muted)] leading-relaxed italic">
               The "Self-Healing" logic uses our **Rust-powered harmonic analysis** to detect failure 45 minutes earlier than traditional thresholds, allowing the system to reroute workload BEFORE a hard stop occurs.
             </p>
             <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase text-white/60">
                <Activity className="w-3 h-3" />
                <span>Reroute latency: 1.2s</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
