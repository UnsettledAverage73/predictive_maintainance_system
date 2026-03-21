'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Search, LayoutDashboard, Calendar, AlertTriangle, Settings, Cpu, TerminalSquare, X } from 'lucide-react';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0d12]/80 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4 animate-in fade-in duration-200" onClick={() => setOpen(false)}>
      <div 
        className="w-full max-w-2xl bg-[#0D1117] border-2 border-[var(--color-border)] rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden animate-in slide-in-from-top-4 duration-300" 
        onClick={e => e.stopPropagation()}
      >
        <Command className="w-full h-full flex flex-col" label="Global Command Menu">
          <div className="flex items-center border-b border-[var(--color-border)] px-4 bg-[var(--color-surface)]/50">
            <Search className="w-5 h-5 text-[var(--color-muted)] shrink-0" />
            <Command.Input 
              placeholder="Type a command or search machines..." 
              className="flex-1 bg-transparent border-0 outline-none px-4 py-4 text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] text-base"
              autoFocus
            />
            <button 
              onClick={() => setOpen(false)}
              className="text-[var(--color-muted)] hover:text-white transition-colors bg-[var(--color-border)]/50 hover:bg-[var(--color-border)] rounded p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
            <Command.Empty className="py-10 text-center text-sm text-[var(--color-muted)]">
              No results found.
            </Command.Empty>

            <Command.Group heading="Navigation" className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-widest px-2 py-3">
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/dashboard'))}
                className="flex items-center gap-3 px-3 py-3 mt-1 rounded-lg text-sm text-[var(--color-foreground)] aria-selected:bg-[var(--color-primary)]/10 aria-selected:text-[var(--color-primary)] cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/dashboard/schedule'))}
                className="flex items-center gap-3 px-3 py-3 mt-1 rounded-lg text-sm text-[var(--color-foreground)] aria-selected:bg-[var(--color-primary)]/10 aria-selected:text-[var(--color-primary)] cursor-pointer"
              >
                <Calendar className="w-4 h-4" /> View Maintenance Schedule
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/dashboard/alerts'))}
                className="flex items-center gap-3 px-3 py-3 mt-1 rounded-lg text-sm text-[var(--color-foreground)] aria-selected:bg-[var(--color-primary)]/10 aria-selected:text-[var(--color-primary)] cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4" /> Open Alert Center
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/settings'))}
                className="flex items-center gap-3 px-3 py-3 mt-1 rounded-lg text-sm text-[var(--color-foreground)] aria-selected:bg-[var(--color-primary)]/10 aria-selected:text-[var(--color-primary)] cursor-pointer"
              >
                <Settings className="w-4 h-4" /> Manage Settings
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Machines & Telemetry" className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-widest px-2 py-3 border-t border-[var(--color-border)] mt-2">
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/dashboard/machines/MCH-001'))}
                className="flex items-center gap-3 px-3 py-3 mt-1 rounded-lg text-sm text-[var(--color-foreground)] aria-selected:bg-[var(--color-primary)]/10 aria-selected:text-[var(--color-primary)] cursor-pointer"
              >
                <Cpu className="w-4 h-4" /> Extruder Line Alpha
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/dashboard/machines/MCH-003'))}
                className="flex items-center gap-3 px-3 py-3 mt-1 rounded-lg text-sm text-[var(--color-foreground)] aria-selected:bg-[var(--color-primary)]/10 aria-selected:text-[var(--color-primary)] cursor-pointer"
              >
                <Cpu className="w-4 h-4" /> Main Compressor
              </Command.Item>
            </Command.Group>
            
            <Command.Group heading="System" className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-widest px-2 py-3 border-t border-[var(--color-border)] mt-2">
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/settings/cloud-connect'))}
                className="flex items-center gap-3 px-3 py-3 mt-1 rounded-lg text-sm text-[var(--color-foreground)] aria-selected:bg-[var(--color-primary)]/10 aria-selected:text-[var(--color-primary)] cursor-pointer"
              >
                <TerminalSquare className="w-4 h-4" /> Configure Cloud Connect
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
