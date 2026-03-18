'use client';

import { useRouter } from 'next/navigation';
import { Equipment } from '@/lib/mockData';
import { AlertTriangle, TrendingUp, Gauge, Thermometer, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface EquipmentCardProps {
  equipment: Equipment;
}

const statusColors = {
  healthy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const riskColors = {
  low: 'text-emerald-400',
  medium: 'text-yellow-400',
  high: 'text-red-400',
};

export default function EquipmentCard({ equipment }: EquipmentCardProps) {
  const router = useRouter();

  // SOVEREIGN LOGIC: Extract load_factor (default to 1.0 if not provided by API)
  const powerPercent = (equipment.load_factor ?? 1.0) * 100;
  const isThrottled = powerPercent < 100;

  return (
    <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 cursor-pointer group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-black text-lg text-foreground group-hover:text-primary transition-colors">
            {equipment.name}
          </h3>
          <p className="text-sm text-muted-foreground">{equipment.type}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[equipment.status as keyof typeof statusColors]}`}>
          {equipment.status.charAt(0).toUpperCase() + equipment.status.slice(1)}
        </div>
      </div>

      {/* --- SOVEREIGN POWER METER (NEW) --- */}
      <div className="mb-6 p-3 bg-secondary/30 rounded-lg border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${isThrottled ? 'text-amber-500 animate-pulse' : 'text-blue-400'}`} />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Operational Power
            </span>
          </div>
          <span className={`text-xs font-black ${isThrottled ? 'text-amber-500' : 'text-foreground'}`}>
            {powerPercent.toFixed(0)}%
          </span>
        </div>
        <Progress 
          value={powerPercent} 
          className={`h-1.5 ${isThrottled ? 'bg-amber-950' : 'bg-input'}`} 
          // Note: In Tailwind, you might need to use a custom data-attribute or inline style for indicator color
        />
        {isThrottled && (
          <p className="text-[10px] mt-2 text-amber-500 font-bold flex items-center gap-1 animate-pulse">
            <AlertTriangle className="w-3 h-3" /> AI MITIGATION ACTIVE: LOAD REDUCED
          </p>
        )}
      </div>

      {/* Health Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">System Health</span>
          <span className="font-bold text-foreground">{equipment.healthScore}%</span>
        </div>
        <div className="w-full h-2 bg-input rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              equipment.healthScore > 75
                ? 'bg-emerald-500'
                : equipment.healthScore > 50
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${equipment.healthScore}%` }}
          />
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4 py-3 border-y border-border">
        <div>
          <p className="text-[10px] text-muted-foreground mb-1 uppercase font-bold">Temp</p>
          <div className="flex items-center gap-1">
            <Thermometer className="w-4 h-4 text-orange-400" />
            <span className="font-semibold text-foreground">{equipment.temperature}°C</span>
          </div>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-1 uppercase font-bold">Vib</p>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-foreground">{equipment.vibration}</span>
          </div>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-1 uppercase font-bold">Risk</p>
          <div className="flex items-center gap-2">
            <span className={`font-black text-xs uppercase ${riskColors[equipment.failureRisk as keyof typeof riskColors]}`}>
              {equipment.failureRisk}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Meta Data */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Uptime</p>
          <span className="text-sm font-semibold text-emerald-400">{equipment.uptime}%</span>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Maintenance</p>
          <span className="text-sm font-semibold text-foreground">{equipment.nextMaintenance}</span>
        </div>
      </div>

      {/* Action Button */}
      <Button
        onClick={() => router.push(`/equipment/${equipment.id}`)}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest text-xs"
      >
        Access Machine Link
      </Button>
    </div>
  );
}
