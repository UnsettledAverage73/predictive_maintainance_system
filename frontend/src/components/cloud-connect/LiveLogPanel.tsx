'use client';
import { useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface LogEntry {
  timestamp?: string;
  severity?: 'INFO' | 'WARN' | 'ERROR' | string;
  message: string;
  status?: string;
}

export function LiveLogPanel({ active, logs: externalLogs }: { active: boolean, logs?: LogEntry[] }) {
  const [internalLogs, setInternalLogs] = useState<any[]>([]);
  const parentRef = useRef<HTMLDivElement>(null);

  const logs = externalLogs || internalLogs;

  const rowVirtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
  });

  // Auto scroll
  useEffect(() => {
    if (logs.length > 0) {
      rowVirtualizer.scrollToIndex(logs.length - 1, { align: 'end', behavior: 'smooth' });
    }
  }, [logs.length, rowVirtualizer]);

  const downloadLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] ${l.severity}: ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'connection-logs.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'INFO': return 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]';
      case 'WARN': return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
      case 'ERROR': return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="h-full bg-[#0D1117] flex flex-col border-l border-[var(--color-border)]">
      <div className="flex justify-between items-center p-4 border-b border-[#30363D] shrink-0">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center">
          <svg className="w-5 h-5 mr-2 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M4 15h16a1 1 0 001-1V6a1 1 0 00-1-1H4a1 1 0 00-1 1v8a1 1 0 001 1z" /></svg>
          Live Connection Log
        </h3>
        <div className="flex space-x-3">
          <button onClick={() => setLogs([])} className="text-xs text-slate-500 hover:text-white transition-colors">Clear</button>
          <button onClick={downloadLogs} className="text-xs text-[var(--color-primary)] hover:underline transition-colors flex items-center">
             <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
             Download
          </button>
        </div>
      </div>
      <div ref={parentRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs custom-scrollbar relative">
        {logs.length === 0 && (
          <div className="text-slate-600 italic mt-6 flex flex-col items-center opacity-50 justify-center h-40">
            <svg className="w-8 h-8 mb-2 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            Waiting for connection events...
          </div>
        )}
        
        {logs.length > 0 && (
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const log = logs[virtualRow.index];
              const severity = (log.severity || log.status || 'INFO').toUpperCase();
              const timestamp = log.timestamp || new Date().toLocaleTimeString();
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="flex items-start space-x-3 group py-1"
                >
                  <span className="text-slate-600 shrink-0 select-none">[{timestamp}]</span>
                  <div className="flex items-center space-x-2 w-16 shrink-0 pt-0.5">
                    <span className={`w-2 h-2 rounded-full ${getSeverityStyle(severity)}`}></span>
                    <span className={`font-semibold ${severity === 'INFO' ? 'text-teal-400' : severity === 'WARN' ? 'text-amber-400' : 'text-red-400'}`}>{severity}</span>
                  </div>
                  <span className="text-slate-300 break-words flex-1 leading-snug">{log.message}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
