'use client';

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { api } from "@/lib/api";
import { Activity } from "lucide-react";

export function MachineUsageChart() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const usageData = await api.getFactoryUsage();
        setData(usageData || []);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch usage data:", err);
        setError("Capacity data currently unavailable");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsage();
    const interval = setInterval(fetchUsage, 5000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading && data.length === 0) {
    return (
      <div className="h-[300px] w-full bg-[#1C2128]/50 animate-pulse rounded-xl border border-[var(--color-border)] flex items-center justify-center">
        <span className="text-slate-500 font-mono text-xs">Aggregating factory usage...</span>
      </div>
    );
  }

  if (error && data.length === 0) {
    return (
      <div className="h-[300px] w-full bg-red-500/5 rounded-xl border border-red-500/10 flex flex-col items-center justify-center gap-3">
        <div className="p-3 rounded-full bg-red-500/10 border border-red-500/20">
          <Activity className="w-5 h-5 text-red-500/50" />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-red-500/60">{error}</p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 rounded-xl flex flex-col gap-4 min-w-0 overflow-hidden">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm uppercase tracking-widest text-[var(--color-muted)] flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--color-primary)]" />
          Real-time Capacity Utilization
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Live Matrix</span>
        </div>
      </div>

      <div className="w-full min-w-0">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363D" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="#8B949E" 
              fontSize={10} 
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#8B949E" 
              fontSize={10} 
              domain={[0, 100]} 
              tickFormatter={(v) => `${v}%`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ backgroundColor: '#0D1117', borderColor: '#30363D', color: '#E6EDF3', borderRadius: '8px' }}
            />
            <Bar dataKey="usage" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.usage > 80 ? '#EF4444' : entry.usage > 50 ? '#F59E0B' : '#00D4AA'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="p-3 bg-[var(--color-background)] rounded-lg border border-[var(--color-border)]">
          <span className="text-[10px] uppercase font-bold text-[var(--color-muted)] block mb-1">Average Load</span>
          <span className="text-xl font-bold font-mono text-[var(--color-primary)]">
            {data.length ? (data.reduce((acc, curr) => acc + curr.usage, 0) / data.length).toFixed(1) : 0}%
          </span>
        </div>
        <div className="p-3 bg-[var(--color-background)] rounded-lg border border-[var(--color-border)]">
          <span className="text-[10px] uppercase font-bold text-[var(--color-muted)] block mb-1">Peak Utilization</span>
          <span className="text-xl font-bold font-mono text-[var(--color-warning)]">
            {data.length ? Math.max(...data.map(d => d.usage)).toFixed(1) : 0}%
          </span>
        </div>
      </div>
    </div>
  );
}
