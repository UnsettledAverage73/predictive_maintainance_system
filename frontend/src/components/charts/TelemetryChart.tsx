'use client';

import { useState, useEffect } from "react";
import { TelemetryPoint } from "@/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface TelemetryChartProps {
  data: TelemetryPoint[];
  machineId?: string;
  className?: string;
}

export function TelemetryChart({ data: initialData, machineId, className }: TelemetryChartProps) {
  const [range, setRange] = useState('24h');
  const [chartData, setChartData] = useState<any[]>(initialData);

  useEffect(() => {
    setChartData(initialData);
  }, [initialData]);

  useEffect(() => {
    if (!machineId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NEXT_PUBLIC_API_URL?.replace(/^https?:\/\//, '') || 'localhost:8000';
    const ws = new WebSocket(`${protocol}//${host}/api/telemetry/ws/${machineId}`);

    ws.onmessage = (event) => {
      const point = JSON.parse(event.data);
      setChartData(prev => {
        const newData = [...prev, {
          timestamp: point.time,
          temperature: point.temperature,
          vibration: point.vibration,
          usage: Math.min(100, Math.max(0, (point.vibration / 10) * 100)) // Proxy usage
        }];
        return newData.slice(-100); // Keep last 100 points
      });
    };

    return () => ws.close();
  }, [machineId]);

  return (
    <div className={`glass-panel p-4 rounded-xl w-full flex flex-col ${className || ""}`}>
      {/* Date range buttons */}
      <div className="flex overflow-x-auto pb-4 mb-2 gap-2 snap-x custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        {['1h', '6h', '12h', '24h', '7d', '30d'].map(r => (
          <button 
            key={r}
            onClick={() => setRange(r)}
            className={`snap-center shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${
              range === r 
                ? 'bg-[var(--color-primary)] text-black' 
                : 'bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-white border border-[var(--color-border)]'
            }`}
          >
            Last {r}
          </button>
        ))}
        {machineId && (
          <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Live Stream</span>
          </div>
        )}
      </div>
      
      <div className="h-[300px] w-full mt-2 -ml-3 md:ml-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363D" vertical={false} />
            <XAxis 
              dataKey="timestamp" 
              stroke="#8B949E" 
              fontSize={11}
              tickFormatter={(val) => new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            />
            <YAxis stroke="#8B949E" fontSize={11} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0D1117', borderColor: '#30363D', color: '#E6EDF3', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
              labelStyle={{ color: '#8B949E', marginBottom: '4px' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Line type="monotone" dataKey="temperature" stroke="#EF4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Temp (\u00b0C)" />
            <Line type="monotone" dataKey="vibration" stroke="#F59E0B" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Vibration (mm/s)" />
            <Line type="monotone" dataKey="usage" stroke="#00D4AA" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Usage (%)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

