'use client';
import { useState, useEffect } from 'react';
import { AlertTriangle, Filter, CheckCircle2, AlertCircle, Info, ArrowUpRight, ChevronLeft } from "lucide-react";
import { Alert } from "@/types";
import { cn } from "@/lib/utils";
import { useDrag } from '@use-gesture/react';
import { api } from '@/lib/api';

function SwipeableAlert({ alert, onClick, isSelected, onAcknowledge }: { alert: Alert; onClick: () => void; isSelected: boolean; onAcknowledge: (id: string) => void }) {
  const [acknowledged, setAcknowledged] = useState(alert.status === 'acknowledged' || alert.status === 'resolved');
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const bind = useDrag(({ movement: [mx], down, velocity: [vx] }) => {
    if (acknowledged) return;
    setIsDragging(down);
    const isSwipingRight = mx > 0;
    
    if (!down && isSwipingRight && mx > 80 && vx > 0.4) {
      setAcknowledged(true);
      setTranslateX(0); 
      onAcknowledge(alert.id);
    } else {
      setTranslateX(down && isSwipingRight ? mx : 0);
    }
  }, { 
    axis: 'x', 
    bounds: { left: 0, right: 120 }, 
    rubberband: true 
  });

  return (
    <div className="relative w-full rounded-xl overflow-hidden mb-1 sm:mb-2">
      <div className="absolute inset-0 bg-[var(--color-success)]/20 flex items-center justify-start px-6 rounded-xl border border-[var(--color-success)]/50">
        <span className="text-[var(--color-success)] font-bold text-sm tracking-widest uppercase flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> Acknowledge
        </span>
      </div>
      
      <div 
        {...bind()} 
        onClick={onClick}
        style={{ transform: `translateX(${translateX}px)`, touchAction: 'pan-y' }}
        className={cn(
          "relative p-4 md:p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] cursor-pointer hover:border-[var(--color-primary)]/50 w-full z-10",
          !isDragging && "transition-all duration-300 ease-out",
          isSelected && "border-[var(--color-primary)]/50 bg-[var(--color-primary)]/5 shadow-[0_0_15px_var(--color-primary)]/10",
          acknowledged && "opacity-60 border-[var(--color-success)]/40 bg-[var(--color-success)]/5 shadow-none"
        )}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
             {acknowledged ? <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" /> :
              alert.severity.toLowerCase() === 'critical' ? <AlertTriangle className="w-4 h-4 text-[var(--color-destructive)]" /> : 
              alert.severity.toLowerCase() === 'warning' ? <AlertCircle className="w-4 h-4 text-[var(--color-warning)]" /> :
              <Info className="w-4 h-4 text-[var(--color-info)]" />}
             <span className="text-[10px] md:text-xs font-mono font-bold tracking-widest uppercase text-[var(--color-muted)]">{alert.machineName || alert.machineId}</span>
          </div>
          <span className="text-[10px] text-[var(--color-muted)] shrink-0">{new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <h3 className={cn("font-bold text-sm md:text-base mb-1.5 leading-snug", acknowledged && "line-through text-[var(--color-muted)] font-medium")}>{alert.title}</h3>
        <p className="text-xs text-[var(--color-muted)] line-clamp-1 md:line-clamp-2">{alert.description}</p>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const rawAlerts = await api.getAlerts();
        // Map backend ai_alerts to frontend Alert type
        const mappedAlerts: Alert[] = rawAlerts.map((a: any) => ({
          id: a.id.toString(),
          machineId: a.equipment_id,
          machineName: a.equipment_id, // We'd need to fetch names separately if wanted
          severity: a.severity.toLowerCase() as any,
          title: a.reason,
          description: "Sensor breach detected by IoT Ingestor.",
          aiAnalysis: a.prescription,
          status: "new",
          createdAt: a.timestamp
        }));
        setAlerts(mappedAlerts);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to fetch alerts:", error);
        setIsLoading(false);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = (id: string) => {
    // In a real app, we'd call an API to acknowledge the alert
    console.log("Acknowledged alert:", id);
  };

  const selectedAlert = alerts.find(a => a.id === selectedAlertId) || (alerts.length > 0 ? alerts[0] : null);

  if (isLoading) {
    return <div className="p-12 text-center font-mono text-[var(--color-muted)]">Scanning Factory Matrix for Anomalies...</div>;
  }

  return (
    <div className="flex flex-col pt-2 animate-in fade-in duration-500 pb-20 h-screen md:h-[calc(100vh-80px)] overflow-hidden">
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Alert & Notification Center</h1>
          <p className="text-[var(--color-muted)] text-sm">Triage and manage machine anomalies</p>
        </div>
        <button className="hidden md:flex items-center gap-2 bg-[var(--color-surface)] px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium hover:bg-[var(--color-border)]/50 transition-colors">
          <Filter className="w-4 h-4" /> Filter
        </button>
      </div>

      {alerts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[var(--color-surface)]/50 border border-dashed border-[var(--color-border)] rounded-xl relative overflow-hidden my-4 min-h-[400px]">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--color-success)]/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center text-center max-w-sm px-6">
            <div className="w-20 h-20 bg-[var(--color-success)]/10 rounded-full flex items-center justify-center mb-6 shadow-inner border border-[var(--color-success)]/20 animate-in zoom-in duration-500">
              <CheckCircle2 className="w-10 h-10 text-[var(--color-success)]" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No Active Alerts</h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              All facility systems and machine agents are operating within nominal parameters. Telemetry is being monitored continuously.
            </p>
          </div>
        </div>
      ) : (

      <div className="flex gap-6 h-full min-h-0 relative">
        {/* List View */}
        <div className={cn(
          "w-full md:w-1/2 lg:w-2/5 flex flex-col gap-1 overflow-y-auto pr-0 md:pr-2 custom-scrollbar transition-all duration-300",
          selectedAlertId ? "hidden md:flex" : "flex"
        )}>
          <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-widest font-bold mb-2 ml-1 flex items-center gap-2 px-2 md:px-0">
             <ArrowUpRight className="w-3 h-3 rotate-[30deg]" /> Swipe Right to Acknowledge
          </p>
          {alerts.map((alert) => (
            <SwipeableAlert 
              key={alert.id} 
              alert={alert} 
              isSelected={selectedAlertId === alert.id} 
              onClick={() => setSelectedAlertId(alert.id)} 
              onAcknowledge={handleAcknowledge}
            />
          ))}
        </div>

        {/* Detail Panel */}
        {selectedAlert && (
        <div className={cn(
          "absolute md:relative inset-0 md:inset-auto z-50 md:z-0 w-full md:flex-1 glass-panel md:rounded-xl bg-[#0a0d12] md:bg-[var(--color-surface)]/40 p-5 md:p-6 flex flex-col overflow-y-auto custom-scrollbar transition-transform duration-300",
          selectedAlertId ? "translate-x-0" : "translate-x-full md:translate-x-0 hidden md:flex"
        )}>
          {/* Mobile Back Button */}
          <button 
            onClick={() => setSelectedAlertId(null)}
            className="md:hidden flex items-center gap-2 text-[var(--color-muted)] mb-5 hover:text-white pb-3 border-b border-[var(--color-border)]"
          >
            <ChevronLeft className="w-5 h-5" /> Back to Alert List
          </button>

          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-destructive)]/5 rounded-full blur-[80px]" />
          
          <div className="flex items-start md:items-center gap-4 mb-6 relative z-10 pt-2 md:pt-0">
            <div className={`p-3 shrink-0 rounded-xl border shadow-[0_0_15px_var(--color-destructive)]/20 ${
              selectedAlert.severity === 'critical' ? 'bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] border-[var(--color-destructive)]/20' :
              selectedAlert.severity === 'warning' ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20' :
              'bg-[var(--color-info)]/10 text-[var(--color-info)] border-[var(--color-info)]/20 shadow-[0_0_15px_var(--color-info)]/20'
            }`}>
              {selectedAlert.severity === 'critical' ? <AlertTriangle className="w-7 h-7 md:w-8 md:h-8" /> : 
               selectedAlert.severity === 'warning' ? <AlertCircle className="w-7 h-7 md:w-8 md:h-8" /> :
               <Info className="w-7 h-7 md:w-8 md:h-8" />}
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold leading-snug lg:leading-normal">{selectedAlert.title}</h2>
              <p className="text-xs md:text-sm font-mono text-[var(--color-muted)] flex items-center gap-1 mt-1">
                {selectedAlert.machineName} <ArrowUpRight className="w-3 h-3 text-[var(--color-primary)] cursor-pointer" />
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-6 relative z-10 flex-1">
            <div className="bg-[var(--color-surface)]/50 p-4 rounded-xl border border-[var(--color-border)]">
              <h4 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-[var(--color-muted)] mb-3">Diagnostic Context</h4>
              <p className="text-sm leading-relaxed text-[var(--color-foreground)]">{selectedAlert.description}</p>
            </div>
            
            <div className="border-l-[3px] border-l-[var(--color-primary)] bg-[var(--color-primary)]/5 p-4 rounded-r-xl rounded-l-sm shadow-sm">
              <h4 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-[var(--color-primary)] mb-3 flex items-center gap-2">
                <SparklesIcon /> AI Strategic Prescription
              </h4>
              <p className="text-sm leading-relaxed text-[var(--color-foreground)] whitespace-pre-wrap">{selectedAlert.aiAnalysis}</p>
            </div>

            <div className="mt-auto pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center gap-3">
              <button className="w-full sm:flex-1 bg-[var(--color-primary)] text-[#0D1117] font-bold py-3.5 sm:py-3 rounded-xl hover:brightness-110 transition-colors shadow-[0_0_15px_var(--color-primary)]/30 border border-transparent">
                Deploy Human Technician
              </button>
              <button 
                onClick={() => setSelectedAlertId(null)}
                className="w-full sm:flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] py-3.5 sm:py-3 rounded-xl hover:bg-[var(--color-border)]/50 font-medium transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-[var(--color-muted)]" /> Close Detail
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
      )}
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
  );
}
