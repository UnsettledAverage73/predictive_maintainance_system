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
    <Link href={`/dashboard/machines/${machine.id}`}>
      <div className={cn(
        "glass-panel p-4 rounded-xl hover:border-[var(--color-primary)]/50 transition-colors cursor-pointer group flex flex-col gap-4",
        className
      )}>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusDot status={machine.status} />
              <h3 className="font-semibold text-lg">{machine.name}</h3>
            </div>
            <p className="text-sm text-[var(--color-muted)] font-mono">{machine.id} \u2022 {machine.productionLine}</p>
          </div>
          <RiskBadge score={machine.riskScore} />
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm mt-2">
          <div className="flex flex-col">
            <span className="text-[var(--color-muted)] text-xs">Last Maint.</span>
            <span className="font-mono">{new Date(machine.lastMaintenanceDate).toLocaleDateString()}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[var(--color-muted)] text-xs">Open WOs</span>
            <span className="font-mono">{machine.openWorkOrders}</span>
          </div>
        </div>
      </div>
    </Link>
  );
});
