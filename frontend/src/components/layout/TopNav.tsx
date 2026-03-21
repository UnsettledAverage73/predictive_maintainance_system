"use client";

import { Bell, Search, Hexagon } from "lucide-react";

export function TopNav() {
  return (
    <header className="h-16 w-full glass-panel rounded-none border-x-0 border-t-0 flex items-center justify-between px-6 z-50 sticky top-0">
      <div className="flex items-center gap-2">
        <Hexagon className="w-8 h-8 text-[var(--color-primary)] fill-[var(--color-primary)]/20" />
        <span className="text-xl font-bold tracking-wide">PredictMaint</span>
        <span className="bg-[var(--color-surface)] px-2 py-0.5 rounded border ml-4 text-xs font-mono text-[var(--color-muted)] hidden md:block">
          Detroit Plant Alpha
        </span>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input 
            type="text" 
            placeholder="Search machines, alerts..." 
            className="bg-[var(--color-surface)] border rounded-full pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-[var(--color-primary)] w-64 transition-colors"
          />
        </div>

        <button className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-surface)] transition-colors">
          <Bell className="w-5 h-5 text-[var(--color-muted)]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--color-destructive)] rounded-full animate-pulse border border-[var(--color-card)]" />
        </button>

        <div className="flex items-center gap-3 border-l border-[var(--color-border)] pl-6">
          <div className="flex flex-col items-end hidden md:flex">
            <span className="text-sm font-semibold">Sarah Connor</span>
            <span className="text-[10px] font-mono text-[var(--color-primary)] uppercase">Lead Engineer</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-blue-600 flex items-center justify-center text-sm font-bold shadow-md">
            SC
          </div>
        </div>
      </div>
    </header>
  );
}
