"use client";

import { useState, useEffect } from "react";
import { MachineCard } from "@/components/machines/MachineCard";
import { MachineCardSkeleton } from "@/components/machines/MachineCardSkeleton";
import { Machine } from "@/types";
import { Filter, Settings2 } from "lucide-react";
import { api } from "@/lib/api";

export default function MachinesPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const data = await api.getEquipment();
        setMachines(data);
      } catch (error) {
        console.error("Failed to fetch machines:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMachines();
  }, []);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-12 w-full max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-[var(--color-primary)]" />
            Machine Fleet Directory
          </h1>
          <p className="text-[var(--color-muted)] text-sm flex items-center gap-2 mt-1">
            Browse and manage all physical assets
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-[var(--color-surface)] px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium hover:bg-[var(--color-border)]/50 transition-colors">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <MachineCardSkeleton key={i} />)
        ) : machines.length > 0 ? (
          machines.map(machine => (
            <MachineCard key={machine.id} machine={machine} />
          ))
        ) : (
          <div className="col-span-full py-20 text-center font-mono text-[var(--color-muted)] border border-dashed border-[var(--color-border)] rounded-xl">
            No physical assets found in current matrix.
          </div>
        )}
      </div>
    </div>
  );
}
