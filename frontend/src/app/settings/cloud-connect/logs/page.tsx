'use client';
import { useState } from 'react';
import Link from 'next/link';
import { CloudOff } from 'lucide-react';

const MOCK_LOGS = Array.from({ length: 15 }).map((_, i) => ({
  id: `c-log-${i}`,
  time: `2026-03-${String(20 - Math.floor(i/3)).padStart(2, '0')} ${String(14 - i%4).padStart(2, '0')}:45:00`,
  name: i % 4 === 0 ? 'Testing Azure Conn' : 'Production AWS us-east-1',
  provider: i % 4 === 0 ? 'Azure' : 'AWS',
  event: i % 4 === 0 ? 'Validation Failed' : i % 5 === 0 ? 'Sync Error' : 'Connection Established',
  message: i % 4 === 0 ? 'Invalid Active Directory Tenant ID format' : i % 5 === 0 ? 'S3 bucket policy denies write access' : 'Successfully validated tunnel and agent API',
  severity: i % 4 === 0 || i % 5 === 0 ? 'ERROR' : 'INFO'
}));

export default function CloudConnectLogsPage() {
  const [filter, setFilter] = useState('ALL');

  const filteredLogs = MOCK_LOGS.filter(l => filter === 'ALL' || l.severity === filter);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-24 duration-500 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center text-sm text-[var(--color-primary)] mb-3">
            <Link href="/settings" className="hover:underline">Settings</Link>
            <span className="mx-2 text-[var(--color-muted)]">/</span>
            <Link href="/settings/cloud-connect" className="hover:underline">Cloud Connect</Link>
            <span className="mx-2 text-[var(--color-muted)]">/</span>
            <span className="text-[var(--color-foreground)] font-medium">Logs</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Connection History Logs</h1>
        </div>
        <div className="flex space-x-3 items-center">
          <select 
            value={filter} 
            onChange={e => setFilter(e.target.value)}
            className="px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md text-sm text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors appearance-none pr-10 relative cursor-pointer shadow-sm hover:border-slate-500"
          >
            <option value="ALL">Filtered by: All Severities</option>
            <option value="INFO">Info Logs Only</option>
            <option value="ERROR">Errors & Failures Only</option>
          </select>
          <button className="px-5 py-2.5 border border-[var(--color-border)] text-white bg-[var(--color-surface)] hover:bg-slate-800 rounded-md text-sm transition-colors shadow-sm font-medium">Export CSV</button>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-xl min-h-[400px] flex flex-col">
        {filteredLogs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-slate-800/30 blur-[60px] rounded-full pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
              <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-slate-700/50 animate-in zoom-in duration-500">
                <CloudOff className="w-10 h-10 text-slate-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-200 mb-2 tracking-wide">No Logs Found</h2>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                Could not find any connection logs matching the selected filters. Try adjusting your severity filter.
              </p>
              <button 
                onClick={() => setFilter('ALL')}
                className="px-6 py-2 bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30 rounded-lg text-sm font-bold shadow-sm hover:bg-[var(--color-primary)]/20 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#0D1117] border-b border-[var(--color-border)] text-[var(--color-muted)]">
                <tr>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[11px]">Timestamp</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[11px]">Connection Config</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[11px]">Event Status</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[11px] w-full">Detailed Context</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[11px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors group cursor-default">
                    <td className="p-4 text-[var(--color-muted)] font-mono text-xs">{log.time}</td>
                    <td className="p-4">
                       <div className="flex items-center space-x-3">
                         <span className="w-7 h-7 rounded bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-[9px] text-slate-300 shadow-inner tracking-widest uppercase">{log.provider.substring(0, 3)}</span>
                         <span className="font-semibold text-slate-200">{log.name}</span>
                       </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 flex items-center w-max rounded text-xs font-bold uppercase tracking-wide border shadow-sm ${
                        log.severity === 'ERROR' ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                      }`}>
                        {log.event}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 truncate max-w-sm md:max-w-md lg:max-w-xl" title={log.message}>{log.message}</td>
                    <td className="p-4 text-right">
                      {log.severity === 'ERROR' ? (
                        <button className="text-[var(--color-primary)] hover:text-teal-300 hover:underline text-xs flex items-center justify-end font-semibold transition-colors">
                          Re-run
                        </button>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
