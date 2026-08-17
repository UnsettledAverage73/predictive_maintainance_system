'use client';

import { useState, useEffect } from "react";
import { MachineCard } from "@/components/machines/MachineCard";
import { MachineUsageChart } from "@/components/charts/MachineUsageChart";
import { MachineCardSkeleton } from "@/components/machines/MachineCardSkeleton";
import { Machine, Alert } from "@/types";
import { Activity, AlertTriangle, ArrowRight, Calendar, FileText, Radar, Settings2, ShieldCheck, Sparkles, Wifi, Radio } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import Link from "next/link";

type FactoryStats = {
  globalRisk?: number;
  activeAlerts: number;
  avgHealth: number;
  factoryStatus: string;
};

type BackendAlert = {
  id: string | number;
  equipment_id: string;
  severity: string;
  reason: string;
  prescription: string;
  timestamp: string;
};

type ConnectedSensor = {
  equipment_id: string;
  name: string;
  protocol: string;
  mac_address?: string | null;
  sensor_kind?: string | null;
  last_seen?: string | null;
  temperature?: number | null;
  humidity?: number | null;
  vibration?: number | null;
  telemetry_status?: string | null;
  parameters?: Record<string, unknown>;
  status: string;
};

const normalizeSeverity = (severity: string): Alert["severity"] => {
  const normalized = severity.toLowerCase();
  if (normalized === "critical" || normalized === "warning" || normalized === "info") {
    return normalized;
  }

  return "info";
};

export default function DashboardPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [stats, setStats] = useState<FactoryStats>({ globalRisk: 0, activeAlerts: 0, avgHealth: 100, factoryStatus: 'Optimal' });
  const [recommendations, setRecommendations] = useState<Alert[]>([]);
  const [connectedSensors, setConnectedSensors] = useState<ConnectedSensor[]>([]);
  const [pairMachineId, setPairMachineId] = useState("");
  const [pairMacAddress, setPairMacAddress] = useState("");
  const [pairSensorKind, setPairSensorKind] = useState("temperature");
  const [pairMessage, setPairMessage] = useState<string | null>(null);
  const [isPairing, setIsPairing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [equipmentData, factoryStats, alertsData] = await Promise.all([
          api.getEquipment() as Promise<Machine[]>,
          api.getFactoryStats() as Promise<FactoryStats>,
          api.getAlerts() as Promise<BackendAlert[]>,
        ]);
        const sensorsData = await api.getConnectedSensors(10) as ConnectedSensor[];
        setMachines(equipmentData);
        setStats(factoryStats);
        setConnectedSensors(sensorsData);
        
        const mappedAlerts: Alert[] = alertsData.slice(0, 3).map((a) => ({
          id: a.id.toString(),
          machineId: a.equipment_id,
          machineName: a.equipment_id,
          severity: normalizeSeverity(a.severity),
          title: a.reason,
          description: "Tactical anomaly detected.",
          aiAnalysis: a.prescription,
          status: "new",
          createdAt: a.timestamp
        }));
        setRecommendations(mappedAlerts);
        
        setIsLoading(false);
        setIsLive(true);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5s

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!pairMachineId && machines.length > 0) {
      setPairMachineId(machines.find((machine) => !machine.macAddress)?.id || machines[0].id);
    }
  }, [machines, pairMachineId]);

  const handlePairEsp32 = async () => {
    if (!pairMachineId || !pairMacAddress.trim()) {
      setPairMessage("Select a machine and enter the ESP32 MAC.");
      return;
    }

    setIsPairing(true);
    setPairMessage(null);

    try {
      await api.pairEsp32(pairMachineId, pairMacAddress.trim(), pairSensorKind);
      setPairMessage(`Paired ${pairMacAddress.trim()} to ${pairMachineId} as ${pairSensorKind}`);
      setMachines((current) =>
        current.map((machine) =>
          machine.id === pairMachineId
            ? { ...machine, macAddress: pairMacAddress.trim(), sensorKind: pairSensorKind }
            : machine
        )
      );
      setPairMacAddress("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Pairing failed";
      setPairMessage(message);
    } finally {
      setIsPairing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-8 xl:pb-12 w-full max-w-[1600px] mx-auto overflow-x-hidden">

      <section className="surface-card hairline overflow-hidden rounded-[28px] p-5 md:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-primary)]">
                Live Operations
              </span>
              <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--color-muted)]">
                Shift A / Detroit Plant Alpha
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)] md:text-4xl">
              Plant overview with live machine risk, throughput, and intervention priorities.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-muted)] md:text-base">
              Monitor fleet stability, surface urgent anomalies, and route the next maintenance action without jumping between pages.
            </p>
            <p className="text-[var(--color-muted)] text-sm flex items-center gap-2 mt-4">
              <span className="relative flex h-2 w-2">
                {isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-[var(--color-success)]' : 'bg-slate-500'}`}></span>
              </span>
              {isLive ? 'Live Telemetry feed active' : 'Connecting to fleet...'}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[480px] xl:max-w-[560px]">
            {[
              { label: "Risk posture", value: isLoading ? "--" : `${stats.globalRisk ?? 0}%`, icon: Radar, tone: "text-[var(--color-warning)]" },
              { label: "Fleet health", value: isLoading ? "--" : `${stats.avgHealth}%`, icon: ShieldCheck, tone: "text-[var(--color-primary)]" },
              { label: "Open incidents", value: isLoading ? "--" : `${stats.activeAlerts}`, icon: AlertTriangle, tone: "text-[var(--color-destructive)]" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/8 bg-black/15 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">{item.label}</span>
                  <item.icon className={cn("h-4 w-4", item.tone)} />
                </div>
                <div className={cn("text-3xl font-bold tracking-tight", item.tone)}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: "Total Machines", value: isLoading ? "-" : machines.length, icon: Settings2, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "Active Alerts", value: isLoading ? "-" : stats.activeAlerts, icon: AlertTriangle, color: "text-[var(--color-warning)]", bg: "bg-amber-500/10 border-amber-500/20" },
          { label: "Factory Status", value: isLoading ? "-" : stats.factoryStatus, icon: Calendar, color: "text-[var(--color-info)]", bg: "bg-blue-400/10 border-blue-400/20" },
          { label: "Avg Health Score", value: isLoading ? "-" : `${stats.avgHealth}%`, icon: Activity, color: "text-[var(--color-destructive)]", bg: "bg-red-500/10 border-red-500/20" },
        ].map((kpi, i) => (
          <div key={i} className="surface-card rounded-2xl p-4 md:p-5 flex items-start sm:items-center justify-between flex-col-reverse sm:flex-row gap-3 sm:gap-0">
            <div className="flex flex-col w-full">
              <span className="text-[var(--color-muted)] text-[10px] md:text-xs uppercase font-bold tracking-[0.22em] truncate">{kpi.label}</span>
              <span className="text-2xl md:text-3xl font-bold font-mono mt-2 text-[var(--color-foreground)]">{kpi.value}</span>
            </div>
            <div className={`p-2.5 sm:p-3 rounded-2xl border ${kpi.bg} ${kpi.color} self-end sm:self-auto shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]`}>
              <kpi.icon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col xl:flex-row-reverse gap-6">
        <div className="w-full xl:w-[380px] 2xl:w-[420px] flex-shrink-0 flex flex-col min-w-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-muted)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
              Orchestrator Insights
            </h2>
            <Link href="/dashboard/alerts" className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)] hover:border-[var(--color-primary)]/25">View All</Link>
          </div>
          
          <div className="flex flex-row xl:flex-col gap-4 overflow-x-auto xl:overflow-x-visible pb-4 xl:pb-0 snap-x custom-scrollbar -mx-4 px-4 xl:mx-0 xl:px-0">
            {recommendations.length > 0 ? recommendations.map((rec) => (
              <div key={rec.id} className={cn(
                "surface-card w-[85vw] sm:w-[320px] xl:w-full flex-shrink-0 snap-center rounded-2xl p-5 border-l-[3px] min-h-[176px] flex flex-col transition-all hover:-translate-y-0.5 hover:border-[var(--color-primary)]/30",
                rec.severity === 'critical' ? "border-l-[var(--color-destructive)]" : "border-l-[var(--color-warning)]"
              )}>
                <div className="flex justify-between items-start mb-2">
                  <span className={cn(
                    "text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                    rec.severity === 'critical' ? "text-[var(--color-destructive)] bg-red-500/10" : "text-[var(--color-warning)] bg-amber-500/10"
                  )}>
                    {rec.machineId} \u2022 {rec.severity}
                  </span>
                  <span className="text-[10px] text-[var(--color-muted)] font-mono">{new Date(rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-sm font-medium leading-relaxed text-[var(--color-foreground)] flex-1 line-clamp-3">{rec.aiAnalysis}</p>
                <Link 
                  href={`/dashboard/machines/${rec.machineId}`}
                  className="mt-4 text-xs font-semibold bg-[var(--color-primary)] text-black px-4 py-2.5 rounded-xl hover:brightness-110 transition-all self-start shadow-[0_10px_30px_-18px_rgba(0,212,170,0.85)] flex items-center gap-2"
                >
                  Investigate Asset <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )) : (
              <div className="w-[85vw] sm:w-[320px] xl:w-full flex-shrink-0 snap-center bg-[var(--color-surface)]/50 border border-dashed border-[var(--color-border)] rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <Sparkles className="w-8 h-8 text-[var(--color-muted)] mb-3 opacity-20" />
                <p className="text-xs text-[var(--color-muted)]">No critical prescriptions generated. System baseline is nominal.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-6">
          <section className="surface-card hairline rounded-[28px] p-5 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-muted)]">ESP32 Pairing</h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  Bind a real ESP32 to an onboarded machine using its MAC address from the serial monitor.
                </p>
              </div>
              <div className="flex flex-col gap-2 text-xs text-[var(--color-muted)] lg:text-right">
                <span>Real-time bind: machine record + ESP32 MAC</span>
                <span className="font-mono text-[var(--color-foreground)]">
                  Example MAC: 3c:71:bf:52:d7:c8
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">Machine</span>
                <select
                  value={pairMachineId}
                  onChange={(event) => setPairMachineId(event.target.value)}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm text-[var(--color-foreground)] outline-none focus:border-[var(--color-primary)]"
                >
                  {machines.map((machine) => (
                    <option key={machine.id} value={machine.id}>
                      {machine.name} ({machine.id})
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">ESP32 MAC</span>
                <input
                  value={pairMacAddress}
                  onChange={(event) => setPairMacAddress(event.target.value)}
                  placeholder="3c:71:bf:52:d7:c8"
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 font-mono text-sm text-[var(--color-foreground)] outline-none focus:border-[var(--color-primary)]"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">Sensor Type</span>
                <select
                  value={pairSensorKind}
                  onChange={(event) => setPairSensorKind(event.target.value)}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm text-[var(--color-foreground)] outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="temperature">Temperature only</option>
                  <option value="temperature_humidity">Temperature + humidity</option>
                  <option value="vibration">Vibration</option>
                  <option value="temperature_vibration">Temperature + vibration</option>
                  <option value="multi">Multi-sensor</option>
                </select>
              </label>

              <button
                onClick={handlePairEsp32}
                disabled={isPairing || !machines.length}
                className="self-end rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPairing ? "Pairing..." : "Pair ESP32"}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-[var(--color-muted)]">Status:</span>
              <span className="rounded-full border border-[var(--color-border)] bg-black/20 px-3 py-1 font-mono text-xs text-[var(--color-foreground)]">
                {pairMessage || "Ready to pair"}
              </span>
            </div>
          </section>

          <section className="surface-card hairline rounded-[28px] p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-muted)] flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-[var(--color-primary)]" />
                  Connected Sensors
                </h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">ESP32 devices seen in the last 10 minutes.</p>
              </div>
              <span className="rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
                {connectedSensors.length} online
              </span>
            </div>

            {connectedSensors.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-black/10 p-6 text-sm text-[var(--color-muted)]">
                No ESP32 telemetry has been received yet. Once the device posts to <span className="font-mono text-[var(--color-foreground)]">/api/iot/ingest</span>, it will appear here.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {connectedSensors.map((sensor) => (
                  <div key={sensor.equipment_id} className="rounded-2xl border border-white/8 bg-black/15 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Radio className={`h-4 w-4 ${sensor.status === 'connected' ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}`} />
                          <h3 className="truncate font-semibold text-[var(--color-foreground)]">{sensor.name}</h3>
                        </div>
                        <p className="mt-1 truncate text-xs font-mono text-[var(--color-muted)]">{sensor.equipment_id}</p>
                        <p className="mt-1 truncate text-[11px] font-mono text-[var(--color-muted)]">
                          MAC: {sensor.mac_address || "Unknown"}
                        </p>
                        <p className="mt-1 truncate text-[11px] font-mono text-[var(--color-muted)]">
                          Type: {sensor.sensor_kind || "unclassified"}
                        </p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                        sensor.status === 'connected'
                          ? 'border-[var(--color-success)]/20 bg-[var(--color-success)]/10 text-[var(--color-success)]'
                          : 'border-[var(--color-warning)]/20 bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                      }`}>
                        {sensor.status === 'connected' ? 'Live telemetry' : 'Registered'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-xl border border-white/8 bg-black/10 p-3">
                        <span className="block text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">Temp</span>
                        <span className="mt-1 block font-mono text-[var(--color-foreground)]">
                          {sensor.temperature ?? "--"}{sensor.temperature !== null && sensor.temperature !== undefined ? "°C" : ""}
                        </span>
                      </div>
                      <div className="rounded-xl border border-white/8 bg-black/10 p-3">
                        <span className="block text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">Humidity</span>
                        <span className="mt-1 block font-mono text-[var(--color-foreground)]">
                          {sensor.humidity ?? "--"}{sensor.humidity !== null && sensor.humidity !== undefined ? "%" : ""}
                        </span>
                      </div>
                      <div className="rounded-xl border border-white/8 bg-black/10 p-3 col-span-2">
                        <span className="block text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">Status</span>
                        <span className="mt-1 block font-mono text-[var(--color-foreground)]">
                          {sensor.telemetry_status || "OK"}
                        </span>
                      </div>
                      <div className="rounded-xl border border-white/8 bg-black/10 p-3 col-span-2">
                        <span className="block text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">Last Seen</span>
                        <span className="mt-1 block font-mono text-[var(--color-foreground)]">
                          {sensor.last_seen ? new Date(sensor.last_seen).toLocaleString() : "Awaiting first packet"}
                        </span>
                      </div>
                      {sensor.sensor_kind === "temperature" || sensor.sensor_kind === "temperature_humidity" || sensor.sensor_kind === "temperature_vibration" ? (
                        <div className="rounded-xl border border-white/8 bg-black/10 p-3 col-span-2">
                          <span className="block text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)]">Telemetry hint</span>
                          <span className="mt-1 block text-xs leading-5 text-[var(--color-foreground)]">
                            Send `temperature`, `humidity`, and `status` every 1-5 seconds to keep the MQTT card live. Add `vibration_rms` only if the device also exposes vibration.
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <MachineUsageChart />
          
          <div>
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-muted)]">Machine Fleet</h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">Cards prioritize status, risk score, and maintenance load for faster scanning.</p>
              </div>
              <div className="flex gap-2">
                <Link href="/dashboard/reports/facility" className="hidden md:inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors">
                  <FileText className="w-3.5 h-3.5" />
                  Facility Report
                </Link>
                <Link href="/dashboard/machines" className="hidden md:inline-flex rounded-full border border-white/8 bg-white/4 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-foreground)] hover:border-[var(--color-primary)]/25">
                  Open fleet
                </Link>
              </div>
            </div>
            <div 
              className="grid gap-4 xl:gap-5" 
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
            >
              {isLoading 
                ? Array.from({ length: 6 }).map((_, i) => <MachineCardSkeleton key={i} />)
                : machines.map(machine => (
                    <MachineCard key={machine.id} machine={machine} />
                  ))
              }
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}
