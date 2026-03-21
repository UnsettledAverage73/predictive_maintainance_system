"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { MachineCard } from "@/components/machines/MachineCard";
import { MachineCardSkeleton } from "@/components/machines/MachineCardSkeleton";
import { Machine } from "@/types";
import { Filter, Search, Settings2 } from "lucide-react";
import { api } from "@/lib/api";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type StatusFilter = "all" | Machine["status"];
type ProtocolFilter = "all" | Machine["protocol"];

export default function MachinesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>((searchParams.get("status") as StatusFilter) || "all");
  const [protocolFilter, setProtocolFilter] = useState<ProtocolFilter>((searchParams.get("protocol") as ProtocolFilter) || "all");
  const deferredQuery = useDeferredValue(query);

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

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    setStatusFilter((searchParams.get("status") as StatusFilter) || "all");
    setProtocolFilter((searchParams.get("protocol") as ProtocolFilter) || "all");
  }, [searchParams]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (query.trim()) nextParams.set("q", query.trim());
    else nextParams.delete("q");

    if (statusFilter !== "all") nextParams.set("status", statusFilter);
    else nextParams.delete("status");

    if (protocolFilter !== "all") nextParams.set("protocol", protocolFilter);
    else nextParams.delete("protocol");

    const nextQuery = nextParams.toString();
    const currentQuery = searchParams.toString();

    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }
  }, [pathname, protocolFilter, query, router, searchParams, statusFilter]);

  const filteredMachines = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return machines.filter((machine) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          machine.name,
          machine.id,
          machine.productionLine,
          machine.protocol,
          machine.status,
        ].some((value) => value.toLowerCase().includes(normalizedQuery));

      const matchesStatus = statusFilter === "all" || machine.status === statusFilter;
      const matchesProtocol = protocolFilter === "all" || machine.protocol === protocolFilter;

      return matchesQuery && matchesStatus && matchesProtocol;
    });
  }, [deferredQuery, machines, protocolFilter, statusFilter]);

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
        <div className="flex gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          <div className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-3 py-2">
            {filteredMachines.length} visible
          </div>
        </div>
      </div>

      <section className="surface-card rounded-2xl p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by machine name, ID, line, protocol, or status"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] py-3 pl-10 pr-4 text-sm outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-3 text-sm text-[var(--color-muted)]">
              <Filter className="h-4 w-4" />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="bg-transparent text-[var(--color-foreground)] outline-none"
              >
                <option value="all">All statuses</option>
                <option value="online">Online</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
                <option value="offline">Offline</option>
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-3 text-sm text-[var(--color-muted)]">
              <Settings2 className="h-4 w-4" />
              <select
                value={protocolFilter}
                onChange={(event) => setProtocolFilter(event.target.value as ProtocolFilter)}
                className="bg-transparent text-[var(--color-foreground)] outline-none"
              >
                <option value="all">All protocols</option>
                <option value="OPC-UA">OPC-UA</option>
                <option value="MQTT">MQTT</option>
                <option value="Modbus">Modbus</option>
                <option value="REST">REST</option>
                <option value="CSV">CSV</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <MachineCardSkeleton key={i} />)
        ) : filteredMachines.length > 0 ? (
          filteredMachines.map(machine => (
            <MachineCard key={machine.id} machine={machine} />
          ))
        ) : (
          <div className="col-span-full py-20 text-center font-mono text-[var(--color-muted)] border border-dashed border-[var(--color-border)] rounded-xl">
            No machines match the current search and filter set.
          </div>
        )}
      </div>
    </div>
  );
}
