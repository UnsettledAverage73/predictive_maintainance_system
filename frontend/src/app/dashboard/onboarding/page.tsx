"use client";

import { useState } from "react";
import { StepWizard } from "@/components/ui/StepWizard";
import { ArrowLeft, ArrowRight, Plug, Settings2, Plus, Zap, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const totalSteps = 3;

  const [formData, setFormData] = useState({
    protocol: "MQTT",
    assetName: "Robotic Arm Delta",
    productionLine: "Line 2 - Assembly",
    operator: "Sarah Connor (Lead Eng)",
    brokerUrl: "mqtt://10.0.1.55",
    port: "1883",
    topic: "telemetry/arm-delta/#"
  });

  const handleNext = async () => {
    if (step === totalSteps) {
      setIsSubmitting(true);
      try {
        await api.onboardMachine({
          id: "MCH-" + Math.random().toString(36).substr(2, 4).toUpperCase(),
          name: formData.assetName,
          productionLine: formData.productionLine,
          protocol: formData.protocol
        });
        setStep(s => s + 1);
      } catch (error) {
        console.error("Onboarding failed:", error);
        alert("Failed to onboard machine. Check if backend is online.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setStep(s => Math.min(totalSteps + 1, s + 1));
    }
  };

  const handlePrev = () => setStep(s => Math.max(1, s - 1));

  if (step > totalSteps) {
    return (
      <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center animate-in zoom-in duration-500 max-w-2xl mx-auto mt-20">
        <div className="w-20 h-20 rounded-full bg-[var(--color-success)]/20 flex items-center justify-center text-[var(--color-success)] mb-6 shadow-[0_0_30px_var(--color-success)] animation-pulse border-4 border-[var(--color-success)]/50">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Agent Spawned Successfully!</h2>
        <p className="text-[var(--color-muted)] mb-8 max-w-md leading-relaxed">
          The Predictive Maintenance Agent has successfully attached to "{formData.assetName}" via {formData.protocol}. Anomaly detection models are calibrating. Data will be live in approximately 30 seconds.
        </p>
        <button 
          onClick={() => window.location.href = "/dashboard"}
          className="bg-[var(--color-surface)] border border-[var(--color-border)] px-6 py-3 rounded-xl hover:bg-[var(--color-primary)] hover:text-[#0D1117] transition-all font-bold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center animate-in fade-in duration-500 pb-12 w-full max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-3">
          <Zap className="w-8 h-8 text-[var(--color-primary)] fill-[var(--color-primary)]/20" /> 
          Machine Onboarding Wizard
        </h1>
        <p className="text-[var(--color-muted)] text-sm">Connect a new asset and spawn its dedicated AI guardian agent.</p>
      </div>

      <StepWizard currentStep={step} totalSteps={totalSteps} labels={["Protocol", "Connection", "Configuration"]} />

      <div className="w-full glass-panel rounded-2xl p-8 mb-8 mt-4 min-h-[350px]">
        {step === 1 && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-bold mb-6">Select Telemetry Protocol</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {["OPC-UA", "MQTT", "Modbus", "REST DB", "CSV Upload"].map((p, i) => (
                <div key={p} 
                  onClick={() => setFormData({...formData, protocol: p})}
                  className={cn(
                  "p-6 rounded-xl border-2 flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all",
                  formData.protocol === p ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-[0_0_15px_var(--color-primary)]/10" : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-muted)]"
                )}>
                  <Plug className={cn("w-8 h-8", formData.protocol === p ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]")} />
                  <span className="font-bold text-sm tracking-wide">{p}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
            <h3 className="text-lg font-bold">Configure Connection ({formData.protocol})</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-[var(--color-muted)] font-bold">Broker URL</label>
                <input 
                  type="text" 
                  value={formData.brokerUrl}
                  onChange={(e) => setFormData({...formData, brokerUrl: e.target.value})}
                  placeholder="mqtt://broker.hivemq.com" 
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
                <label className="text-xs uppercase tracking-widest text-[var(--color-muted)] font-bold">Topic Subscription</label>
                <input 
                  type="text" 
                  value={formData.topic}
                  onChange={(e) => setFormData({...formData, topic: e.target.value})}
                  placeholder="plant/line2/machine/#" 
                  className="bg-[var(--color-background)] border border-[var(--color-border)] p-3 rounded-lg font-mono text-sm focus:border-[var(--color-primary)] outline-none" 
                />
              </div>
            </div>
            <button className="self-start px-4 py-2 border border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10 rounded-lg text-sm font-bold hover:bg-[var(--color-primary)] hover:text-[#0D1117] transition-colors flex items-center gap-2">
              <Plug className="w-4 h-4" /> Test Connection
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col gap-6">
            <h3 className="text-lg font-bold">Machine Assignment</h3>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-[var(--color-muted)] font-bold">Machine Asset Name</label>
                <input 
                  type="text" 
                  value={formData.assetName}
                  onChange={(e) => setFormData({...formData, assetName: e.target.value})}
                  className="bg-[var(--color-background)] border border-[var(--color-border)] p-3 rounded-lg text-sm focus:border-[var(--color-primary)] outline-none" 
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-[var(--color-muted)] font-bold">Production Line</label>
                <select 
                  value={formData.productionLine}
                  onChange={(e) => setFormData({...formData, productionLine: e.target.value})}
                  className="bg-[var(--color-background)] border border-[var(--color-border)] p-3 rounded-lg text-sm focus:border-[var(--color-primary)] outline-none">
                  <option>Line 1 - Extrusion</option>
                  <option>Line 2 - Assembly</option>
                  <option>Line 3 - Packaging</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-[var(--color-muted)] font-bold">Lead Operator</label>
                <select 
                  value={formData.operator}
                  onChange={(e) => setFormData({...formData, operator: e.target.value})}
                  className="bg-[var(--color-background)] border border-[var(--color-border)] p-3 rounded-lg text-sm focus:border-[var(--color-primary)] outline-none">
                  <option>Sarah Connor (Lead Eng)</option>
                  <option>Mike T. (Technician)</option>
                  <option>Alex J. (Technician)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

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
              {step === totalSteps ? "Spawn Agent" : "Continue"}
              {step === totalSteps ? <Plus className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
