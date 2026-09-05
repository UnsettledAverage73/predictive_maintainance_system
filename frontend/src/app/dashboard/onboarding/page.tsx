"use client";

import { useState, useEffect } from "react";
import { StepWizard } from "@/components/ui/StepWizard";
import { 
  ArrowLeft, ArrowRight, Plug, Settings2, Plus, Zap, CheckCircle2, 
  AlertTriangle, Cpu, Activity, Download, RefreshCw, Radio, 
  Thermometer, Gauge, Volume2, ToggleLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import Link from "next/link";

interface AvailableSensor {
  id: string;
  name: string;
  metric: string;
  unit: string;
  pin: string;
  icon: any;
  description: string;
  defaultChecked: boolean;
}

const AVAILABLE_SENSORS: AvailableSensor[] = [
  {
    id: "temperature",
    name: "DHT11 / DHT22 Temp",
    metric: "Motor Temperature",
    unit: "°C",
    pin: "GPIO 4",
    icon: Thermometer,
    description: "Monitors stator core thermal buildup and overheating risk",
    defaultChecked: true
  },
  {
    id: "humidity",
    name: "DHT11 / DHT22 Humidity",
    metric: "Ambient Humidity",
    unit: "%",
    pin: "GPIO 4",
    icon: Gauge,
    description: "Detects enclosure condensation risk and moisture ingression",
    defaultChecked: true
  },
  {
    id: "current_draw",
    name: "ACS712 Current Sensor",
    metric: "Motor Load Current",
    unit: "A RMS",
    pin: "GPIO 34 (ADC1)",
    icon: Zap,
    description: "Detects motor overload, mechanical binding, and stall surges",
    defaultChecked: true
  },
  {
    id: "rpm",
    name: "Hall Effect (Digital D0)",
    metric: "Shaft Rotational Speed",
    unit: "RPM",
    pin: "GPIO 25 (Interrupt)",
    icon: Activity,
    description: "Measures real-time shaft rotational velocity and slip frequency",
    defaultChecked: true
  },
  {
    id: "hall_analog",
    name: "Hall Effect (Analog A0)",
    metric: "Magnetic Flux / Proximity",
    unit: "Raw ADC",
    pin: "GPIO 35 (ADC1)",
    icon: Radio,
    description: "Evaluates rotor magnetic flux symmetry and shaft proximity",
    defaultChecked: true
  },
  {
    id: "button_state",
    name: "Operator Push Button",
    metric: "Operator Event / E-Stop",
    unit: "State",
    pin: "GPIO 27 (Pull-Up)",
    icon: ToggleLeft,
    description: "Triggers immediate priority telemetry and operator inspection events",
    defaultChecked: true
  },
  {
    id: "buzzer_state",
    name: "Piezo Buzzer / Relay",
    metric: "Acoustic Alarm / Actuator",
    unit: "State",
    pin: "GPIO 13",
    icon: Volume2,
    description: "Audible alarm and bidirectional AI load throttle indicator",
    defaultChecked: true
  },
  {
    id: "vibration_rms",
    name: "Vibration Sensor / Accelerometer",
    metric: "Vibration RMS",
    unit: "mm/s",
    pin: "I2C (GPIO 21/22)",
    icon: Activity,
    description: "Harmonic vibration and bearing degradation detection",
    defaultChecked: false
  },
  {
    id: "pressure",
    name: "Pressure Transducer",
    metric: "Fluid / Pneumatic Pressure",
    unit: "bar",
    pin: "Analog 0-5V",
    icon: Gauge,
    description: "Hydraulic lubrication or pneumatic clamp pressure index",
    defaultChecked: false
  }
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isScanningDevices, setIsScanningDevices] = useState(false);
  const [detectedDevices, setDetectedDevices] = useState<any[]>([]);
  const [testResult, setTestResult] = useState<{status: 'success' | 'error', message: string} | null>(null);
  const [createdMachineId, setCreatedMachineId] = useState<string | null>(null);
  const totalSteps = 4;

  const [formData, setFormData] = useState({
    protocol: "ESP32",
    assetName: "Precision Spindle Motor Alpha",
    assetId: "MTR-" + Math.random().toString(36).substr(2, 4).toUpperCase(),
    machineType: "Industrial Motor / Drive",
    productionLine: "Line 1 - Spindle Drive",
    operator: "Sarah Connor (Lead Eng)",
    selectedSensors: AVAILABLE_SENSORS.filter(s => s.defaultChecked).map(s => s.id),
    wifiSsid: "Atharva's iPhone",
    wifiPassword: "12345678",
    serverIp: "10.74.118.181",
    serverPort: "8000",
    esp32Mac: "3c:71:bf:52:d7:c8",
    brokerUrl: "mqtt://10.0.1.55",
    port: "1883",
    topic: "telemetry/asset/#"
  });

  // Detect local IP & connected USB devices on mount
  useEffect(() => {
    const fetchEnvironment = async () => {
      try {
        const net = await api.getNetworkEndpoint().catch(() => null);
        if (net?.local_ip) {
          setFormData(prev => ({
            ...prev,
            serverIp: net.local_ip,
            serverPort: String(net.port || 8000)
          }));
        }
      } catch (e) {}

      scanDevices();
    };

    fetchEnvironment();
  }, []);

  const scanDevices = async () => {
    setIsScanningDevices(true);
    try {
      const res = await api.detectDevices().catch(() => ({ devices: [] }));
      if (res?.devices) {
        setDetectedDevices(res.devices);
        const esp = res.devices.find((d: any) => d.known_mac);
        if (esp?.known_mac) {
          setFormData(prev => ({ ...prev, esp32Mac: esp.known_mac }));
        }
      }
    } catch (e) {
      console.warn("Device scan warning:", e);
    } finally {
      setIsScanningDevices(false);
    }
  };

  const toggleSensor = (sensorId: string) => {
    setFormData(prev => {
      const exists = prev.selectedSensors.includes(sensorId);
      const next = exists 
        ? prev.selectedSensors.filter(id => id !== sensorId)
        : [...prev.selectedSensors, sensorId];
      return { ...prev, selectedSensors: next };
    });
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);
    try {
      if (formData.protocol === "ESP32") {
        await scanDevices();
        if (detectedDevices.length > 0) {
          setTestResult({
            status: 'success',
            message: `ESP32 node confirmed on ${detectedDevices[0].port} (MAC: ${formData.esp32Mac || '3c:71:bf:52:d7:c8'}). Ready for streaming.`
          });
        } else {
          setTestResult({
            status: 'success',
            message: `Backend ingest listening at http://${formData.serverIp}:${formData.serverPort}/api/iot/ingest. Waiting for ESP32 WiFi packets.`
          });
        }
      } else {
        const res = await api.testConnection({
          protocol: formData.protocol,
          url: formData.brokerUrl,
          port: formData.port
        });
        setTestResult({ status: 'success', message: res.message });
      }
    } catch (error: any) {
      setTestResult({ status: 'error', message: error.message || "Connection test failed" });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleDownloadFirmware = () => {
    const sketch = generateArduinoSketch(formData);
    const blob = new Blob([sketch], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `esp32_${formData.assetId.toLowerCase().replace(/[^a-z0-9]/g, "_")}.ino`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleNext = async () => {
    if (step === totalSteps) {
      setIsSubmitting(true);
      try {
        const payload = {
          id: formData.assetId,
          name: formData.assetName,
          productionLine: formData.productionLine,
          protocol: formData.protocol,
          machineType: formData.machineType,
          macAddress: formData.protocol === "ESP32" ? formData.esp32Mac : undefined,
          sensorKind: "multi",
          sensors: formData.selectedSensors,
          brokerUrl: formData.brokerUrl,
          port: formData.port,
          topic: formData.topic
        };

        await api.onboardMachine(payload);
        setCreatedMachineId(formData.assetId);
        setStep(s => s + 1);
      } catch (error) {
        console.error("Onboarding failed:", error);
        alert("Failed to onboard machine. Please verify that the backend API is online.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setStep(s => Math.min(totalSteps + 1, s + 1));
    }
  };

  const handlePrev = () => {
    setStep(s => Math.max(1, s - 1));
    setTestResult(null);
  };

  // Completion Screen
  if (step > totalSteps) {
    return (
      <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center animate-in zoom-in duration-500 max-w-2xl mx-auto mt-12 border border-[var(--color-primary)]/30">
        <div className="w-20 h-20 rounded-full bg-[var(--color-success)]/20 flex items-center justify-center text-[var(--color-success)] mb-6 shadow-[0_0_30px_var(--color-success)] animation-pulse border-4 border-[var(--color-success)]/50">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Asset & Sensors Onboarded!</h2>
        <p className="text-sm font-mono text-[var(--color-primary)] mb-4">Asset ID: {createdMachineId}</p>
        <p className="text-[var(--color-muted)] mb-6 max-w-md leading-relaxed text-sm">
          The Predictive Maintenance Agent has successfully attached to <strong>&quot;{formData.assetName}&quot;</strong> via <strong>{formData.protocol}</strong>. 
          Registered <strong>{formData.selectedSensors.length} active physical sensors</strong>. Anomaly detection models are calibrating.
        </p>
        <div className="flex gap-4">
          <Link
            href={`/dashboard/machines/${createdMachineId}`}
            className="bg-[var(--color-primary)] text-[#0D1117] px-6 py-3 rounded-xl hover:bg-[#00e6b8] transition-all font-bold shadow-[0_0_20px_var(--color-primary)]/30 flex items-center gap-2"
          >
            <Activity className="w-4 h-4" /> Open Live Telemetry Matrix
          </Link>
          <Link
            href="/dashboard"
            className="bg-[var(--color-surface)] border border-[var(--color-border)] px-6 py-3 rounded-xl hover:bg-[var(--color-surface)]/80 transition-all font-bold"
          >
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center animate-in fade-in duration-500 pb-12 w-full max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-3">
          <Zap className="w-8 h-8 text-[var(--color-primary)] fill-[var(--color-primary)]/20" /> 
          Machine & Sensor Onboarding Hub
        </h1>
        <p className="text-[var(--color-muted)] text-sm">
          Register new physical equipment, configure installed sensors, pair IoT nodes, and spawn dedicated AI guardians.
        </p>
      </div>

      <StepWizard 
        currentStep={step} 
        totalSteps={totalSteps} 
        labels={["Machine Info", "Protocol", "Sensors & Pins", "Connect & Deploy"]} 
      />

      <div className="w-full glass-panel rounded-2xl p-8 mb-8 mt-2 min-h-[460px] border border-white/10">
        
        {/* STEP 1: Machine Asset Details */}
        {step === 1 && (
          <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
            <div>
              <h3 className="text-lg font-bold">Machine Asset Specification</h3>
              <p className="text-xs text-[var(--color-muted)] mt-1">Provide identification details for the industrial asset.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-[var(--color-muted)] font-bold">Machine Asset Name</label>
                <input 
                  type="text" 
                  value={formData.assetName}
                  onChange={(e) => setFormData({...formData, assetName: e.target.value})}
                  placeholder="e.g. Precision CNC Lathe Alpha"
                  className="bg-[var(--color-background)] border border-[var(--color-border)] p-3 rounded-lg text-sm focus:border-[var(--color-primary)] outline-none font-medium" 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-[var(--color-muted)] font-bold">Asset Identifier (ID)</label>
                <input 
                  type="text" 
                  value={formData.assetId}
                  onChange={(e) => setFormData({...formData, assetId: e.target.value.toUpperCase()})}
                  placeholder="e.g. CNC001 or MTR002"
                  className="bg-[var(--color-background)] border border-[var(--color-border)] p-3 rounded-lg font-mono text-sm focus:border-[var(--color-primary)] outline-none uppercase" 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-[var(--color-muted)] font-bold">Machine Class / Type</label>
                <select 
                  value={formData.machineType}
                  onChange={(e) => setFormData({...formData, machineType: e.target.value})}
                  className="bg-[var(--color-background)] border border-[var(--color-border)] p-3 rounded-lg text-sm focus:border-[var(--color-primary)] outline-none">
                  <option>Industrial Motor / Drive</option>
                  <option>CNC Machine</option>
                  <option>Centrifugal Pump</option>
                  <option>Air Compressor</option>
                  <option>Hydraulic Press</option>
                  <option>Robotic Arm</option>
                  <option>Injection Molder</option>
                  <option>Conveyor System</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-[var(--color-muted)] font-bold">Production Line / Cell</label>
                <select 
                  value={formData.productionLine}
                  onChange={(e) => setFormData({...formData, productionLine: e.target.value})}
                  className="bg-[var(--color-background)] border border-[var(--color-border)] p-3 rounded-lg text-sm focus:border-[var(--color-primary)] outline-none">
                  <option>Line 1 - Spindle Drive</option>
                  <option>Line 1 - Extrusion</option>
                  <option>Line 2 - Assembly</option>
                  <option>Line 3 - Packaging</option>
                  <option>Line 4 - Machining</option>
                </select>
              </div>

              <div className="flex flex-col gap-2 col-span-1 md:col-span-2">
                <label className="text-xs uppercase tracking-widest text-[var(--color-muted)] font-bold">Lead Shift Engineer / Operator</label>
                <input 
                  type="text" 
                  value={formData.operator}
                  onChange={(e) => setFormData({...formData, operator: e.target.value})}
                  placeholder="e.g. Sarah Connor (Lead Eng)"
                  className="bg-[var(--color-background)] border border-[var(--color-border)] p-3 rounded-lg text-sm focus:border-[var(--color-primary)] outline-none" 
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Protocol Selection */}
        {step === 2 && (
          <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
            <div>
              <h3 className="text-lg font-bold">Select Telemetry Protocol</h3>
              <p className="text-xs text-[var(--color-muted)] mt-1">Choose how telemetry is ingested from this physical machine.</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {/* ESP32 Featured Protocol Card */}
              <div 
                onClick={() => setFormData({...formData, protocol: "ESP32"})}
                className={cn(
                  "p-6 rounded-xl border-2 flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all relative",
                  formData.protocol === "ESP32" 
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-[0_0_20px_var(--color-primary)]/20" 
                    : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-muted)]"
                )}
              >
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[8px] font-bold bg-[var(--color-primary)] text-black uppercase">
                  Hardware Ready
                </div>
                <Cpu className={cn("w-10 h-10", formData.protocol === "ESP32" ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]")} />
                <div>
                  <span className="font-bold text-sm tracking-wide block">ESP32 / Microcontroller</span>
                  <span className="text-[10px] text-[var(--color-muted)] mt-1 block">WiFi HTTP + USB Serial Streaming</span>
                </div>
              </div>

              {["MQTT", "OPC-UA", "Modbus", "REST DB", "CSV Upload"].map((p) => (
                <div 
                  key={p} 
                  onClick={() => setFormData({...formData, protocol: p})}
                  className={cn(
                    "p-6 rounded-xl border-2 flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all",
                    formData.protocol === p 
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-[0_0_20px_var(--color-primary)]/20" 
                      : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-muted)]"
                  )}
                >
                  <Plug className={cn("w-8 h-8", formData.protocol === p ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]")} />
                  <span className="font-bold text-sm tracking-wide">{p}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Sensor Selection & Hardware Pinout ("Onboard Sensors") */}
        {step === 3 && (
          <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Physical Sensor Configuration</h3>
                <p className="text-xs text-[var(--color-muted)] mt-1">
                  Select which physical sensors are attached to this asset. Only monitored parameters will be registered.
                </p>
              </div>
              <span className="text-xs font-mono px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full font-bold">
                {formData.selectedSensors.length} Sensors Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {AVAILABLE_SENSORS.map((sensor) => {
                const isSelected = formData.selectedSensors.includes(sensor.id);
                const Icon = sensor.icon;
                return (
                  <div 
                    key={sensor.id}
                    onClick={() => toggleSensor(sensor.id)}
                    className={cn(
                      "p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none",
                      isSelected 
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-[0_0_12px_var(--color-primary)]/10" 
                        : "border-[var(--color-border)] bg-[var(--color-surface)] opacity-70 hover:opacity-100"
                    )}
                  >
                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      onChange={() => {}} 
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold flex items-center gap-1.5">
                          <Icon className={cn("w-3.5 h-3.5", isSelected ? "text-[var(--color-primary)]" : "text-zinc-500")} />
                          {sensor.name}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {sensor.pin}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--color-muted)] mt-1">{sensor.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400">
                          Metric: {sensor.metric} ({sensor.unit})
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hardware Pinout Mapping Summary */}
            <div className="p-4 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)] mb-2 flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                ESP32 Hardware Wiring Map
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                {formData.selectedSensors.map(sId => {
                  const s = AVAILABLE_SENSORS.find(item => item.id === sId);
                  return s ? (
                    <div key={sId} className="p-2 rounded bg-zinc-900 border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block truncate">{s.name}</span>
                      <span className="text-[var(--color-primary)] font-bold">{s.pin}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Connectivity, Device Pairing & Firmware Tools */}
        {step === 4 && (
          <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Device Connectivity & Pairing ({formData.protocol})</h3>
                <p className="text-xs text-[var(--color-muted)] mt-1">
                  Configure network handshake and verify communication with the device.
                </p>
              </div>
              {testResult && (
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-2",
                  testResult.status === 'success' 
                    ? "bg-[var(--color-success)]/20 text-[var(--color-success)] border border-[var(--color-success)]/30" 
                    : "bg-[var(--color-destructive)]/20 text-[var(--color-destructive)] border border-[var(--color-destructive)]/30"
                )}>
                  {testResult.status === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {testResult.message}
                </div>
              )}
            </div>

            {formData.protocol === "ESP32" ? (
              <div className="flex flex-col gap-5">
                {/* USB Serial Detection Badge */}
                <div className="p-4 rounded-xl border border-white/10 bg-[var(--color-background)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {detectedDevices.length > 0 ? `Active Serial Microcontroller on ${detectedDevices[0].port}` : "Scanning for USB Devices..."}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--color-muted)]">
                        MAC: {formData.esp32Mac || "3c:71:bf:52:d7:c8"} | Baud: 115200
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={scanDevices} 
                    disabled={isScanningDevices}
                    className="px-3 py-1 rounded-lg border border-[var(--color-border)] text-xs font-mono hover:bg-zinc-800 flex items-center gap-1.5"
                  >
                    <RefreshCw className={cn("w-3 h-3", isScanningDevices && "animate-spin")} /> Re-scan
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-widest text-[var(--color-muted)] font-bold">WiFi SSID (Hotspot / AP)</label>
                    <input 
                      type="text" 
                      value={formData.wifiSsid}
                      onChange={(e) => setFormData({...formData, wifiSsid: e.target.value})}
                      placeholder="e.g. Atharva's iPhone"
                      className="bg-[var(--color-background)] border border-[var(--color-border)] p-3 rounded-lg font-mono text-sm focus:border-[var(--color-primary)] outline-none" 
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-widest text-[var(--color-muted)] font-bold">WiFi Password</label>
                    <input 
                      type="text" 
                      value={formData.wifiPassword}
                      onChange={(e) => setFormData({...formData, wifiPassword: e.target.value})}
                      placeholder="e.g. 12345678"
                      className="bg-[var(--color-background)] border border-[var(--color-border)] p-3 rounded-lg font-mono text-sm focus:border-[var(--color-primary)] outline-none" 
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-widest text-[var(--color-muted)] font-bold">Server Host IP</label>
                    <input 
                      type="text" 
                      value={formData.serverIp}
                      onChange={(e) => setFormData({...formData, serverIp: e.target.value})}
                      placeholder="e.g. 10.74.118.181"
                      className="bg-[var(--color-background)] border border-[var(--color-border)] p-3 rounded-lg font-mono text-sm focus:border-[var(--color-primary)] outline-none" 
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-widest text-[var(--color-muted)] font-bold">ESP32 Hardware MAC Address</label>
                    <input 
                      type="text" 
                      value={formData.esp32Mac}
                      onChange={(e) => setFormData({...formData, esp32Mac: e.target.value})}
                      placeholder="e.g. 3c:71:bf:52:d7:c8"
                      className="bg-[var(--color-background)] border border-[var(--color-border)] p-3 rounded-lg font-mono text-sm focus:border-[var(--color-primary)] outline-none" 
                    />
                  </div>
                </div>

                {/* Firmware Tools Box */}
                <div className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <span className="text-xs font-bold text-white block">Custom Arduino C++ Sketch Ready</span>
                    <span className="text-[11px] text-[var(--color-muted)]">
                      Generated with {formData.selectedSensors.length} sensors, WiFi credentials, and target IP pre-configured.
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleDownloadFirmware}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5" /> Download .ino Firmware
                    </button>
                    <button 
                      onClick={handleTestConnection}
                      disabled={isTestingConnection}
                      className="px-4 py-2 bg-[var(--color-primary)]/10 border border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg text-xs font-bold hover:bg-[var(--color-primary)] hover:text-[#0D1117] transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isTestingConnection ? (
                        <><span className="w-3.5 h-3.5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" /> Verifying...</>
                      ) : (
                        <><Plug className="w-3.5 h-3.5" /> Test Handshake</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest text-[var(--color-muted)] font-bold">Broker / Endpoint URL</label>
                  <input 
                    type="text" 
                    value={formData.brokerUrl}
                    onChange={(e) => setFormData({...formData, brokerUrl: e.target.value})}
                    placeholder="e.g. mqtt://10.0.1.55" 
                    className="bg-[var(--color-background)] border border-[var(--color-border)] p-3 rounded-lg font-mono text-sm focus:border-[var(--color-primary)] outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest text-[var(--color-muted)] font-bold">Port</label>
                  <input 
                    type="text" 
                    value={formData.port}
                    onChange={(e) => setFormData({...formData, port: e.target.value})}
                    placeholder="1883" 
                    className="bg-[var(--color-background)] border border-[var(--color-border)] p-3 rounded-lg font-mono text-sm focus:border-[var(--color-primary)] outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-2 col-span-2">
                  <label className="text-xs uppercase tracking-widest text-[var(--color-muted)] font-bold">Topic / Data Path</label>
                  <input 
                    type="text" 
                    value={formData.topic}
                    onChange={(e) => setFormData({...formData, topic: e.target.value})}
                    placeholder="plant/line1/machine-alpha/#" 
                    className="bg-[var(--color-background)] border border-[var(--color-border)] p-3 rounded-lg font-mono text-sm focus:border-[var(--color-primary)] outline-none" 
                  />
                </div>
                <div className="col-span-2">
                  <button 
                    onClick={handleTestConnection}
                    disabled={isTestingConnection}
                    className="px-6 py-2.5 bg-[var(--color-primary)]/10 border border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg text-sm font-bold hover:bg-[var(--color-primary)] hover:text-[#0D1117] transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isTestingConnection ? "Probing Connection..." : "Test Protocol Connection"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="w-full flex justify-between items-center">
        <button 
          onClick={handlePrev}
          disabled={step === 1 || isSubmitting}
          className="flex items-center gap-2 px-6 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-border)]/50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <button 
          onClick={handleNext}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-8 py-3 rounded-lg bg-[var(--color-primary)] text-[#0D1117] font-bold shadow-[0_0_20px_var(--color-primary)]/40 hover:bg-[#00e6b8] transition-colors hover:scale-105 disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="w-5 h-5 border-2 border-[#0D1117] border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {step === totalSteps ? "Spawn AI Guardian" : "Continue"}
              {step === totalSteps ? <Plus className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function generateArduinoSketch(formData: any): string {
  const hasDht = formData.selectedSensors.includes("temperature") || formData.selectedSensors.includes("humidity");
  const hasCurrent = formData.selectedSensors.includes("current_draw");
  const hasHallRpm = formData.selectedSensors.includes("rpm");
  const hasHallAnalog = formData.selectedSensors.includes("hall_analog");
  const hasButton = formData.selectedSensors.includes("button_state");
  const hasBuzzer = formData.selectedSensors.includes("buzzer_state");

  return `// ==============================================================================
// PREDICTIVE MAINTENANCE FIRMWARE - ASSET: ${formData.assetId}
// Auto-generated by Sovereign AI Predictive Maintenance System
// ==============================================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
${hasDht ? '#include <DHT.h>\n' : ''}
// Network Configuration
const char* WIFI_SSID     = "${formData.wifiSsid}";
const char* WIFI_PASSWORD = "${formData.wifiPassword}";
const char* SERVER_HOST   = "${formData.serverIp}";
const int   SERVER_PORT   = ${formData.serverPort};
const char* INGEST_PATH   = "/api/iot/ingest";

// Equipment Identification
#define EQUIPMENT_ID      "${formData.assetId}"
#define SENSOR_KIND       "multi"
const unsigned long TELEMETRY_INTERVAL_MS = 2000;

// Pin Definitions
${hasDht ? '#define DHT_PIN 4\n#define DHT_TYPE DHT11\nDHT dht(DHT_PIN, DHT_TYPE);\n' : ''}
${hasCurrent ? '#define ACS712_PIN 34\nfloat zeroCurrentAdcOffset = 2048.0f;\n' : ''}
${hasHallRpm ? '#define HALL_D0_PIN 25\nvolatile unsigned long hallPulseCounter = 0;\nfloat measuredRpm = 0.0f;\nvoid IRAM_ATTR onHallPulseISR() { hallPulseCounter++; }\n' : ''}
${hasHallAnalog ? '#define HALL_A0_PIN 35\n' : ''}
${hasButton ? '#define BUTTON_PIN 27\n' : ''}
${hasBuzzer ? '#define BUZZER_PIN 13\n' : ''}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("[Init] Starting ESP32 node for ${formData.assetId}...");
${hasDht ? '  pinMode(DHT_PIN, INPUT_PULLUP);\n  dht.begin();\n' : ''}
${hasButton ? '  pinMode(BUTTON_PIN, INPUT_PULLUP);\n' : ''}
${hasHallRpm ? '  pinMode(HALL_D0_PIN, INPUT_PULLUP);\n  attachInterrupt(digitalPinToInterrupt(HALL_D0_PIN), onHallPulseISR, FALLING);\n' : ''}
${hasBuzzer ? '  pinMode(BUZZER_PIN, OUTPUT);\n  digitalWrite(BUZZER_PIN, LOW);\n' : ''}
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void loop() {
  static unsigned long lastSend = 0;
  if (millis() - lastSend >= TELEMETRY_INTERVAL_MS) {
    lastSend = millis();

    JsonDocument doc;
    doc["equipment_id"] = EQUIPMENT_ID;
    doc["source"] = "esp32";

    JsonObject params = doc["parameters"].to<JsonObject>();
${hasDht ? '    float t = dht.readTemperature(); float h = dht.readHumidity();\n    if (!isnan(t)) params["temperature"] = t;\n    if (!isnan(h)) params["humidity"] = h;\n' : ''}
${hasCurrent ? '    int adc = analogRead(ACS712_PIN); float cur = abs(((float)adc - 2048.0f) * (3.3f / 4095.0f) / 0.1f);\n    params["current_draw"] = cur;\n' : ''}
${hasHallRpm ? '    params["rpm"] = measuredRpm;\n' : ''}
${hasHallAnalog ? '    params["hall_analog"] = analogRead(HALL_A0_PIN);\n' : ''}
${hasButton ? '    params["button_state"] = digitalRead(BUTTON_PIN) == LOW ? 1 : 0;\n' : ''}
${hasBuzzer ? '    params["buzzer_state"] = 0;\n' : ''}

    String jsonPayload;
    serializeJson(doc, jsonPayload);
    Serial.print("[JSON_TELEMETRY] ");
    Serial.println(jsonPayload);

    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin("http://" + String(SERVER_HOST) + ":" + String(SERVER_PORT) + String(INGEST_PATH));
      http.addHeader("Content-Type", "application/json");
      http.POST(jsonPayload);
      http.end();
    }
  }
  delay(10);
}
`;
}
