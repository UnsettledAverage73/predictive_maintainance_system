'use client';
import { MaintenanceTask } from "@/types";

interface MaintenanceTableProps {
  logs: MaintenanceTask[];
}

export function MaintenanceTable({ logs }: MaintenanceTableProps) {
  return (
    <div className="w-full">
      {/* Desktop Table View */}
      <div className="hidden md:block w-full overflow-x-auto glass-panel rounded-xl">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-[var(--color-muted)] uppercase bg-[var(--color-surface)] border-b border-[var(--color-border)]">
            <tr>
              <th className="px-4 py-3 font-semibold tracking-wider">Date</th>
              <th className="px-4 py-3 font-semibold tracking-wider">Action Taken</th>
              <th className="px-4 py-3 font-semibold tracking-wider">Technician</th>
              <th className="px-4 py-3 font-semibold tracking-wider">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-[var(--color-surface)]/50 transition-colors">
                <td className="px-4 py-3 font-mono text-[var(--color-muted)] text-xs">
                  {new Date(log.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-[var(--color-foreground)] font-medium text-sm">{log.title}</td>
                <td className="px-4 py-3 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-[var(--color-border)] flex items-center justify-center text-[10px] font-bold shadow-sm">
                    {log.assignedTo.charAt(0)}
                  </div>
                  <span className="text-sm">{log.assignedTo}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase ${
                    log.status === 'completed' ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' 
                    : log.status === 'in_progress' ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                    : 'bg-[var(--color-info)]/10 text-[var(--color-info)]'
                  }`}>
                    {log.status.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="flex flex-col gap-3 md:hidden">
        {logs.map((log) => (
          <div key={log.id} className="glass-panel p-4 rounded-xl flex flex-col gap-3 relative overflow-hidden shadow-sm">
            <div className={`absolute top-0 left-0 w-1 h-full ${
              log.status === 'completed' ? 'bg-[var(--color-success)] shadow-[0_0_10px_var(--color-success)]' 
              : log.status === 'in_progress' ? 'bg-[var(--color-warning)] shadow-[0_0_10px_var(--color-warning)]'
              : 'bg-[var(--color-info)] shadow-[0_0_10px_var(--color-info)]'
            }`} />
            
            <div className="flex justify-between items-start pl-2">
              <h4 className="font-bold text-[13px] text-white tracking-wide pr-2 leading-snug">{log.title}</h4>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase whitespace-nowrap ${
                log.status === 'completed' ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20' 
                : log.status === 'in_progress' ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border border-[var(--color-warning)]/20'
                : 'bg-[var(--color-info)]/10 text-[var(--color-info)] border border-[var(--color-info)]/20'
              }`}>
                {log.status.replace('_', ' ')}
              </span>
            </div>
            
            <div className="flex justify-between items-center text-xs pl-2 pt-1">
              <span className="font-mono text-[var(--color-muted)] text-[11px]">
                {new Date(log.createdAt).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-2 text-[var(--color-muted)]">
                <span className="text-[11px] font-medium">{log.assignedTo}</span>
                <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-[9px] font-bold text-white shadow-inner">
                  {log.assignedTo.charAt(0)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
