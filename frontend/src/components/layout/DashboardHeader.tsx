'use client';

import { useEffect, useState } from "react";
import { Bell, ChevronRight, Search } from "lucide-react";

export function DashboardHeader() {
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const syncCount = () => {
      const value = window.localStorage.getItem('command-palette-alert-count');
      setAlertCount(value ? Number(value) || 0 : 0);
    };

    syncCount();
    window.addEventListener('storage', syncCount);
    window.addEventListener('command-palette-alerts-updated', syncCount);

    return () => {
      window.removeEventListener('storage', syncCount);
      window.removeEventListener('command-palette-alerts-updated', syncCount);
    };
  }, []);

  const openPalette = () => {
    window.dispatchEvent(new CustomEvent('command-palette:open'));
  };

  return (
    <header className="hidden md:flex h-[78px] shrink-0 items-center gap-4 border-b border-white/8 bg-[rgba(8,12,18,0.78)] px-6 backdrop-blur-xl lg:px-8">
      <div className="flex items-center gap-3 rounded-full border border-white/8 bg-white/4 px-3 py-2 text-xs text-[var(--color-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-success)] shadow-[0_0_10px_rgba(34,197,94,0.75)]" />
        <span className="font-mono uppercase tracking-[0.28em] text-[11px]">SYS.O.S. v2.0</span>
      </div>
      <div className="hidden min-w-[320px] flex-1 lg:flex lg:justify-center">
        <button
          onClick={openPalette}
          className="group flex w-full max-w-xl items-center gap-3 rounded-full border border-white/8 bg-white/4 px-4 py-3 text-left text-sm text-[var(--color-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-[var(--color-primary)]/25 hover:bg-white/6"
        >
          <Search className="h-4 w-4 text-[var(--color-primary)]" />
          <span className="flex-1">Search machines, alerts, and logs</span>
          <span className="rounded-md border border-white/10 bg-black/15 px-2 py-1 font-mono text-[11px] uppercase tracking-widest">
            Ctrl K
          </span>
        </button>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <button className="hidden lg:flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-3 py-2 text-xs font-medium text-[var(--color-muted)] hover:border-[var(--color-primary)]/25 hover:text-[var(--color-foreground)]">
          Operations Hub
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/8 bg-white/4 text-[var(--color-muted)] hover:border-[var(--color-primary)]/25 hover:text-[var(--color-foreground)]">
          <Bell className="h-4.5 w-4.5" />
          {alertCount > 0 && (
            <span className="absolute right-2.5 top-2.5 min-w-[18px] rounded-full bg-[var(--color-destructive)] px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
              {Math.min(alertCount, 99)}
            </span>
          )}
        </button>
        <div className="flex items-center gap-3 rounded-full border border-white/8 bg-white/4 py-1.5 pl-1.5 pr-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(0,212,170,0.95),rgba(56,189,248,0.92))] text-sm font-bold text-black shadow-[0_10px_30px_-16px_rgba(0,212,170,0.9)]">
            AD
          </div>
          <div className="hidden xl:block">
            <p className="text-sm font-semibold leading-tight">A. Director</p>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">Plant Control</p>
          </div>
        </div>
      </div>
    </header>
  );
}
