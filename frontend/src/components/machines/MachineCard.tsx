'use client';
import React from "react";
import { Machine } from "@/types";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { StatusDot } from "@/components/ui/StatusDot";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface MachineCardProps {
  machine: Machine;
  className?: string;
}

export const MachineCard = React.memo(function MachineCard({ machine, className }: MachineCardProps) {
  return (
    <Link href={`/dashboard/machines/${machine.id}`} className="block h-full">
      <div className={cn(
        "glass-panel h-full rounded-2xl p-4 md:p-5 hover:border-[var(--color-primary)]/50 hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col gap-4",
        className
      )}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <StatusDot status={machine.status} />
              <h3 className="truncate text-lg font-semibold">{machine.name}</h3>
            </div>
            <p className="truncate text-sm text-[var(--color-muted)] font-mono">{machine.id} \u2022 {machine.productionLine}</p>
          </div>
          <RiskBadge score={machine.riskScore} />
        </div>
        
        <div className="mt-1 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-white/8 bg-black/10 p-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Last Maint.</span>
            <span className="mt-2 block font-mono text-[var(--color-foreground)]">{new Date(machine.lastMaintenanceDate).toLocaleDateString()}</span>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/10 p-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Open WOs</span>
            <span className="mt-2 block font-mono text-[var(--color-foreground)]">{machine.openWorkOrders}</span>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-white/8 pt-3 text-xs">
          <span className="font-medium uppercase tracking-[0.18em] text-[var(--color-muted)]">Inspect asset</span>
          <span className="rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/8 px-2.5 py-1 font-semibold text-[var(--color-primary)]">
            View details
          </span>
        </div>
      </div>
    </Link>
  );
});
