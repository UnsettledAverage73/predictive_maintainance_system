import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/navigation/BottomNav";
import CommandPalette from "@/components/navigation/CommandPalette";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#06090E] overflow-hidden">
      <Sidebar />
      <CommandPalette />
      
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <header className="h-16 border-b border-[var(--color-border)] bg-[#0D1117] flex items-center px-6 shrink-0 relative z-10 md:flex hidden">
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-muted)] font-mono text-sm tracking-widest">SYS.O.S. v2.0</span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-[var(--color-muted)] text-sm mr-4 border border-[var(--color-border)] rounded-lg px-2 py-1 bg-[#06090E]">
              <span className="font-mono border border-[var(--color-border)] rounded px-1.5 shadow-sm">Ctrl</span>
              <span>+</span>
              <span className="font-mono border border-[var(--color-border)] rounded px-1.5 shadow-sm">K</span>
              <span className="ml-1 text-xs uppercase tracking-wider">Search Menu</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/20 border border-[var(--color-primary)] flex items-center justify-center text-[var(--color-primary)] font-bold text-sm shadow-[0_0_10px_var(--color-primary)]/20">
              AD
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto custom-scrollbar p-4 md:p-6 lg:p-8 bg-gradient-to-br from-[#06090E] to-[#0A0D14] pb-24 md:pb-8">
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
