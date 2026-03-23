'use client';

import { FileText, IndianRupee, ShieldAlert, Wrench } from "lucide-react";
import { MachineInsights } from "@/types";

interface MachineInsightsGridProps {
  insights: MachineInsights;
}

const formatInr = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

export function MachineInsightsGrid({ insights }: MachineInsightsGridProps) {
  const { costAnalysis, threatDetection, incidentReport, wearModel } = insights;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <section className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-muted)] font-bold">Maintenance Cost Analysis</p>
            <h3 className="text-xl font-black text-white mt-1">Planned vs Reactive Cost</h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/25 flex items-center justify-center">
            <IndianRupee className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Planned" value={formatInr(costAnalysis.plannedCostInr)} tone="emerald" />
          <MetricCard label="Reactive" value={formatInr(costAnalysis.reactiveCostInr)} tone="red" />
          <MetricCard label="Downtime" value={formatInr(costAnalysis.downtimeCostInr)} tone="amber" />
          <MetricCard label="Savings" value={formatInr(costAnalysis.estimatedSavingsInr)} tone="emerald" />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">ROI</p>
              <p className="text-lg font-black text-white">{costAnalysis.roiLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-[var(--color-primary)]">{costAnalysis.estimatedSavingsPct}%</p>
              <p className="text-[11px] text-[var(--color-muted)]">estimated reduction</p>
            </div>
          </div>
          <p className="text-sm text-slate-300 mt-3">
            Recommended part: <span className="font-semibold text-white">{costAnalysis.primaryPart}</span>. Reactive event is
            <span className="font-semibold text-white"> {costAnalysis.plannedVsReactiveRatio}x </span>
            more expensive than planned service.
          </p>
        </div>
      </section>

      <section className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-muted)] font-bold">Threat & Risk Detection</p>
            <h3 className="text-xl font-black text-white mt-1">{threatDetection.threat}</h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
        </div>

        <div className="flex items-end justify-between rounded-xl border border-red-500/15 bg-red-500/5 p-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-red-300 font-bold">Threat Confidence</p>
            <p className="text-3xl font-black text-white">{threatDetection.confidence}%</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-white">{threatDetection.affectedComponent}</p>
            <p className="text-[11px] text-red-200">estimated window: {threatDetection.timeWindowHours}h</p>
          </div>
        </div>

        <div className="space-y-2">
          {threatDetection.evidence.map((item) => (
            <div key={item} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-muted)] font-bold">Intelligent Incident Reporting</p>
            <h3 className="text-xl font-black text-white mt-1">{incidentReport.title}</h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
            <FileText className="w-5 h-5 text-amber-300" />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)] font-bold">Root Cause</p>
          <p className="text-sm text-slate-200 mt-2 leading-relaxed">{incidentReport.rootCause}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <FiveWCard label="Who" value={incidentReport.fiveW.who} />
          <FiveWCard label="What" value={incidentReport.fiveW.what} />
          <FiveWCard label="Where" value={incidentReport.fiveW.where} />
          <FiveWCard label="When" value={incidentReport.fiveW.when} />
        </div>
      </section>

      <section className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-muted)] font-bold">Wear & Tear Modeling</p>
            <h3 className="text-xl font-black text-white mt-1">{wearModel.wearStatus} wear profile</h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-sky-300" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="RUL" value={`${wearModel.rulHours}h`} tone="sky" />
          <MetricCard label="Wear Index" value={`${wearModel.wearIndex}`} tone="amber" />
          <MetricCard label="Runtime" value={`${wearModel.currentRuntimeHours}h`} tone="neutral" />
          <MetricCard label="Overdue" value={`${wearModel.overdueHours}h`} tone="red" />
        </div>

        <div className="rounded-xl border border-sky-500/15 bg-sky-500/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-sky-200 font-bold">What-if Simulation</p>
          <p className="text-sm text-slate-200 mt-2">{wearModel.whatIfScenario}</p>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'emerald' | 'red' | 'amber' | 'sky' | 'neutral' }) {
  const toneClass = {
    emerald: 'border-emerald-500/15 bg-emerald-500/5 text-emerald-300',
    red: 'border-red-500/15 bg-red-500/5 text-red-300',
    amber: 'border-amber-500/15 bg-amber-500/5 text-amber-300',
    sky: 'border-sky-500/15 bg-sky-500/5 text-sky-300',
    neutral: 'border-white/10 bg-white/5 text-slate-200',
  }[tone];

  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-[0.18em] font-bold opacity-80">{label}</p>
      <p className="text-lg font-black mt-1">{value}</p>
    </div>
  );
}

function FiveWCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)] font-bold">{label}</p>
      <p className="text-sm text-slate-200 mt-2 leading-relaxed">{value}</p>
    </div>
  );
}
